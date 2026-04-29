import { Ollama } from "ollama";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { fichasTecnicas, professionals } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

const ollama = new Ollama({ host: ENV.ollamaUrl });

// Default model priority: try each in order until one is available
const DEFAULT_MODEL_PRIORITY = ["dom-ai", "llama3", "llama3.2:3b", "mistral", "gemma2"];

export async function listOllamaModels(): Promise<string[]> {
  try {
    const { models } = await ollama.list();
    // Filter out embedding-only models
    const embeddingKeywords = ["embed", "nomic"];
    return models
      .map((m) => m.name)
      .filter((name) => !embeddingKeywords.some((k) => name.toLowerCase().includes(k)));
  } catch (err) {
    console.error("[Ollama] Failed to list models:", err);
    return [];
  }
}

async function resolveModel(preferredModel?: string): Promise<string> {
  const available = await listOllamaModels();

  if (available.length === 0) {
    throw new Error(
      "Nenhum modelo Ollama disponível. Verifique se o serviço está rodando em: " + ENV.ollamaUrl
    );
  }

  // If user picked a specific model and it's available, use it
  if (preferredModel && available.includes(preferredModel)) {
    return preferredModel;
  }

  // Otherwise pick by priority
  for (const candidate of DEFAULT_MODEL_PRIORITY) {
    const match = available.find((m) => m.startsWith(candidate));
    if (match) return match;
  }

  // Fallback: first available
  return available[0];
}

export async function processAiCommand(prompt: string, model?: string) {
  // 1. Fetch available events to provide context to the LLM
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const events = await db
    .select({ id: fichasTecnicas.id, name: fichasTecnicas.eventName })
    .from(fichasTecnicas);
  const eventNamesList = events.map((e) => e.name).join(", ");

  const resolvedModel = await resolveModel(model);
  console.log(`[Ollama] Using model: ${resolvedModel}`);

  const systemPrompt = `
Você é um assistente especialista em gestão de eventos para a DOM Produções.
Seu objetivo é analisar o pedido do usuário e retornar um objeto JSON estrito descrevendo a ação a ser executada no banco de dados.

Ações possíveis:
- "add_professional": Adicionar um profissional à equipe técnica de um evento.
- "update_ficha_status": Alterar o status do evento (ex: publicar, transformar em rascunho).
- "add_schedule_item": Adicionar uma atividade ao cronograma do evento.
- "update_event_info": Atualizar informações do evento (local, data, atração, endereço).

Contexto atual:
Eventos cadastrados no banco de dados: [${eventNamesList}]

Regras:
1. Você DEVE responder APENAS com um objeto JSON válido. Não inclua texto antes ou depois do JSON.
2. Tente fazer o 'match' do nome do evento citado pelo usuário com um dos eventos da lista de cadastrados.
3. Se o usuário pedir para "publicar", use status "published". Se pedir "rascunho", use "draft".

Formatos de JSON esperados:

Para "add_professional":
{ "action": "add_professional", "data": { "eventName": "...", "professionalName": "...", "professionalRole": "...", "professionalContact": "..." } }

Para "update_ficha_status":
{ "action": "update_ficha_status", "data": { "eventName": "...", "status": "published" | "draft" } }

Para "add_schedule_item":
{ "action": "add_schedule_item", "data": { "eventName": "...", "time": "HH:MM", "activity": "..." } }

Para "update_event_info":
{ "action": "update_event_info", "data": { "eventName": "...", "field": "location" | "eventDate" | "attraction" | "address", "value": "..." } }
`;

  try {
    const response = await ollama.chat({
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      format: "json",
      options: {
        temperature: 0.1,
      },
    });

    let raw = response.message.content.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const result = JSON.parse(raw);

    if (!result.action || !result.data || !result.data.eventName) {
      return { success: false, message: "Comando incompleto ou evento não especificado.", raw: result };
    }

    const { eventName } = result.data;
    const targetEvents = await db
      .select()
      .from(fichasTecnicas)
      .where(like(fichasTecnicas.eventName, `%${eventName}%`));

    if (targetEvents.length === 0) {
      throw new Error(`Evento "${eventName}" não encontrado.`);
    }

    const eventId = targetEvents[0].id;
    const actualEventName = targetEvents[0].eventName;

    // 2. Execute the action
    switch (result.action) {
      case "add_professional": {
        const { professionalName, professionalRole, professionalContact } = result.data;
        await db.insert(professionals).values({
          fichaId: eventId,
          name: professionalName || "Profissional",
          role: professionalRole || "Staff",
          contact: professionalContact || "",
        });
        return {
          success: true,
          message: `✅ Profissional ${professionalName} adicionado como ${professionalRole || "Staff"} no evento ${actualEventName}.`,
          modelUsed: resolvedModel,
        };
      }

      case "update_ficha_status": {
        const { status } = result.data;
        const validStatus = status === "published" ? "published" : "draft";
        const { updateFicha } = await import("./db");
        await updateFicha(eventId, { status: validStatus });
        return {
          success: true,
          message: `✅ Status do evento ${actualEventName} alterado para ${validStatus === "published" ? "Publicado" : "Rascunho"}.`,
          modelUsed: resolvedModel,
        };
      }

      case "add_schedule_item": {
        const { time, activity } = result.data;
        const { scheduleItems } = await import("../drizzle/schema");
        await db.insert(scheduleItems).values({
          fichaId: eventId,
          time: time || "",
          activity: activity || "",
          sortOrder: 99,
        });
        return {
          success: true,
          message: `✅ Item de cronograma ("${activity}") adicionado ao evento ${actualEventName}.`,
          modelUsed: resolvedModel,
        };
      }

      case "update_event_info": {
        const { field, value } = result.data;
        const { updateFicha } = await import("./db");
        const updateData: any = {};
        if (["location", "eventDate", "attraction", "address"].includes(field)) {
          updateData[field] = value;
          await updateFicha(eventId, updateData);
          return {
            success: true,
            message: `✅ Informação "${field}" do evento ${actualEventName} atualizada para "${value}".`,
            modelUsed: resolvedModel,
          };
        }
        throw new Error(`Campo "${field}" não suportado para atualização.`);
      }

      default:
        return { success: false, message: "Ação não suportada pelo modelo.", raw: result };
    }
  } catch (error: any) {
    console.error("[Ollama Error]", error);
    throw new Error("Erro ao processar comando de IA: " + error.message);
  }
}
