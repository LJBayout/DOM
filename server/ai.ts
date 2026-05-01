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

export async function processAiCommand(messages: { role: 'user' | 'assistant' | 'system', content: string }[], model?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const events = await db
    .select({ id: fichasTecnicas.id, name: fichasTecnicas.eventName })
    .from(fichasTecnicas);
  const eventNamesList = events.map((e) => e.name).join(", ");

  const resolvedModel = await resolveModel(model);
  console.log(`[Ollama] Using model: ${resolvedModel}`);

  const systemPrompt = `
Você é o DOM AI, o assistente virtual inteligente da DOM Produções. 
Você é proativo, eficiente e tem uma personalidade profissional porém amigável.

Sua função é ajudar na gestão de fichas técnicas de eventos. Você pode realizar ações no banco de dados ou apenas conversar com o usuário.

Contexto atual:
Eventos cadastrados: [${eventNamesList}]

Regras:
1. Você DEVE responder APENAS com um objeto JSON válido.
2. Se o usuário pedir para realizar uma ação (adicionar profissional, mudar status, etc), identifique o evento e a ação.
3. Se o usuário estiver apenas conversando ou fazendo uma pergunta, use a ação "chat".
4. No campo "response", coloque a mensagem que eu (o bot) devo falar para o usuário. Mesmo se fizer uma ação, explique o que fez de forma amigável.

Ações possíveis:
- "create_event": { "eventName": "...", "eventDate": "...", "location": "...", "address": "...", "attraction": "...", "localProducerName": "...", "localProducerContact": "..." }
- "add_professional": { "eventName": "...", "professionalName": "...", "professionalRole": "...", "professionalContact": "..." }
- "add_hotel": { "eventName": "...", "hotelName": "...", "hotelAddress": "...", "hotelContact": "..." }
- "add_logistics": { "eventName": "...", "logisticsRole": "...", "logisticsName": "...", "logisticsContact": "..." }
- "update_ficha_status": { "eventName": "...", "status": "published" | "draft" }
- "add_schedule_item": { "eventName": "...", "time": "HH:MM", "activity": "..." }
- "update_event_info": { "eventName": "...", "field": "location" | "eventDate" | "attraction" | "address", "value": "..." }
- "chat": { "text": "sua resposta aqui" }

Formato de resposta esperado:
{
  "action": "create_event" | "add_professional" | "add_hotel" | "add_logistics" | "update_ficha_status" | "add_schedule_item" | "update_event_info" | "chat",
  "data": { ... },
  "response": "Sua mensagem amigável aqui explicando o que fez ou respondendo à pergunta."
}
`;

  try {
    const response = await ollama.chat({
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      format: "json",
      options: {
        temperature: 0.7,
      },
    });

    let raw = response.message.content.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const result = JSON.parse(raw);

    if (result.action === "chat") {
      return { 
        success: true, 
        message: result.response || result.data?.text || "Olá! Como posso ajudar?", 
        modelUsed: resolvedModel,
        actionTaken: "chat"
      };
    }

    if (!result.action || !result.data || !result.data.eventName) {
      return { success: false, message: result.response || "Comando incompleto ou evento não especificado.", raw: result };
    }

    const { eventName } = result.data;
    let eventId = 0;
    let actualEventName = eventName;

    if (result.action !== "create_event") {
      const targetEvents = await db
        .select()
        .from(fichasTecnicas)
        .where(like(fichasTecnicas.eventName, `%${eventName}%`));

      if (targetEvents.length === 0) {
        throw new Error(`Evento "${eventName}" não encontrado.`);
      }

      eventId = targetEvents[0].id;
      actualEventName = targetEvents[0].eventName;
    }

    // 2. Execute the action
    switch (result.action) {
      case "create_event": {
        const { createFicha } = await import("./db");
        const { eventDate, location, address, attraction, localProducerName, localProducerContact } = result.data;
        eventId = await createFicha({
          eventName: eventName,
          eventDate: eventDate || "",
          location: location || "",
          address: address || "",
          attraction: attraction || "",
          localProducerName: localProducerName || "",
          localProducerContact: localProducerContact || "",
          status: "draft",
          createdByOpenId: "system", // Will default if handled by AI, but preferably we grab the user
        });
        return {
          success: true,
          message: result.response || `✅ Evento "${eventName}" criado com sucesso! Agora você pode adicionar profissionais, hotéis e itens no cronograma.`,
          modelUsed: resolvedModel,
        };
      }
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
          message: result.response || `✅ Profissional ${professionalName} adicionado como ${professionalRole || "Staff"} no evento ${actualEventName}.`,
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
          message: result.response || `✅ Status do evento ${actualEventName} alterado para ${validStatus === "published" ? "Publicado" : "Rascunho"}.`,
          modelUsed: resolvedModel,
        };
      }

      case "add_hotel": {
        const { hotelName, hotelAddress, hotelContact } = result.data;
        const { hotels } = await import("../drizzle/schema");
        await db.insert(hotels).values({
          fichaId: eventId,
          name: hotelName || "Hospedagem",
          address: hotelAddress || "",
          contact: hotelContact || "",
        });
        return {
          success: true,
          message: result.response || `✅ Hospedagem "${hotelName}" adicionada ao evento ${actualEventName}.`,
          modelUsed: resolvedModel,
        };
      }

      case "add_logistics": {
        const { logisticsRole, logisticsName, logisticsContact } = result.data;
        const { logistics } = await import("../drizzle/schema");
        await db.insert(logistics).values({
          fichaId: eventId,
          role: logisticsRole || "Logística",
          name: logisticsName || "",
          contact: logisticsContact || "",
        });
        return {
          success: true,
          message: result.response || `✅ Item de logística "${logisticsRole} - ${logisticsName}" adicionado ao evento ${actualEventName}.`,
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
          message: result.response || `✅ Item de cronograma ("${activity}") adicionado ao evento ${actualEventName}.`,
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
            message: result.response || `✅ Informação "${field}" do evento ${actualEventName} atualizada para "${value}".`,
            modelUsed: resolvedModel,
          };
        }
        throw new Error(`Campo "${field}" não suportado para atualização.`);
      }

      default:
        return { success: false, message: result.response || "Ação não suportada pelo modelo.", raw: result };
    }
  } catch (error: any) {
    console.error("[Ollama Error]", error);
    throw new Error("Erro ao processar comando de IA: " + error.message);
  }
}

export async function parseFichaTextWithAi(text: string, model?: string) {
  const resolvedModel = await resolveModel(model);
  
  const systemPrompt = `
Você é o DOM AI, especialista em extração de dados de eventos.
O usuário fornecerá um texto bruto (ex: um checklist, mensagem do whatsapp).
Sua tarefa é extrair as informações e preencher OBRIGATORIAMENTE este JSON. Retorne apenas o JSON.

{
  "eventName": "",
  "eventDate": "",
  "location": "",
  "address": "",
  "attraction": "",
  "localProducerName": "",
  "localProducerContact": "",
  "professionals": [
    { "name": "", "role": "", "contact": "" }
  ],
  "hotels": [
    { "name": "", "address": "", "contact": "", "contactPerson": "", "localContact": "", "gpsLink": "" }
  ],
  "logistics": [
    { "role": "", "name": "", "contact": "" }
  ],
  "scheduleItems": [
    { "time": "HH:MM", "activity": "" }
  ]
}

Regras:
1. Responda APENAS com o objeto JSON.
2. Não invente dados. Se não achar algo, deixe string vazia "" ou array vazio [].
3. Categorize a equipe corretamente:
   - "Som, Luz, Led, Camarim, Gerador" -> professionals
   - "Carregadores, Motoristas, Transporte" -> logistics
   - "Produtor local" -> localProducerName
   - "Produtor responsável/auxiliar" -> professionals
`;

  try {
    const response = await ollama.chat({
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      format: "json",
      options: { temperature: 0.1 },
    });

    let raw = response.message.content.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    return JSON.parse(raw);
  } catch (err: any) {
    throw new Error("Erro ao interpretar texto: " + err.message);
  }
}

export async function suggestGpsLink(locationName: string, address: string, model?: string) {
  const resolvedModel = await resolveModel(model);
  
  const systemPrompt = `
Você é um especialista em geolocalização. O usuário fornecerá um nome de local e, opcionalmente, um endereço.
Sua tarefa é retornar um JSON com os campos:
- "searchQuery": os termos ideais para busca no Google Maps.
- "refinedName": o nome formal e exato do local.
- "refinedAddress": o endereço completo, formal e exato do local (Logradouro, número, bairro, cidade, estado, CEP se disponível).
Não invente coordenadas.

Exemplo:
Entrada: { "name": "Arena DOM", "address": "Silva Jardim" }
Saída: { "searchQuery": "Arena DOM, Silva Jardim, RJ", "refinedName": "Arena DOM", "refinedAddress": "Rua Silva Jardim, 123 - Centro, Silva Jardim - RJ, 28820-000" }
`;

  try {
    const response = await ollama.chat({
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ name: locationName, address }) }
      ],
      format: "json",
      options: { temperature: 0.1 },
    });

    let raw = response.message.content.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const result = JSON.parse(raw);
    const query = encodeURIComponent(result.searchQuery || `${locationName} ${address}`);
    return { 
      query: result.searchQuery,
      refinedName: result.refinedName,
      refinedAddress: result.refinedAddress,
      url: `https://www.google.com/maps/search/?api=1&query=${query}` 
    };
  } catch (err: any) {
    // Fallback to simple query
    const query = encodeURIComponent(`${locationName} ${address}`);
    return { query: `${locationName} ${address}`, url: `https://www.google.com/maps/search/?api=1&query=${query}` };
  }
}
