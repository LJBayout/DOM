import { Ollama } from "ollama";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { fichasTecnicas, professionals } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

const ollama = new Ollama({ host: ENV.ollamaUrl });

// Default model priority: try each in order until one is available
const DEFAULT_MODEL_PRIORITY = ["dom-ai", "llama3.2:3b", "llama3", "mistral", "gemma2"];
const DRAFT_TTL_MS = 30 * 60 * 1000;
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 12000);
const OLLAMA_MAX_ATTEMPTS = Number(process.env.OLLAMA_MAX_ATTEMPTS || 2);

type EventDraftData = {
  eventName: string;
  eventDate: string;
  location: string;
  address: string;
  attraction: string;
  stateCity: string;
  localProducerName: string;
  localProducerContact: string;
};

type PendingEventDraft = {
  data: EventDraftData;
  createdAt: number;
  modelUsed: string;
};

const pendingEventDrafts = new Map<string, PendingEventDraft>();

function normalizeIntentText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isConfirmDraftIntent(text: string): boolean {
  const normalized = normalizeIntentText(text);
  const confirmTokens = [
    "confirmar",
    "confirmo",
    "confirmar criacao",
    "pode criar",
    "criar agora",
    "salvar evento",
    "sim criar",
  ];
  return confirmTokens.some(token => normalized.includes(token));
}

function isCancelDraftIntent(text: string): boolean {
  const normalized = normalizeIntentText(text);
  const cancelTokens = [
    "cancelar",
    "descartar",
    "nao criar",
    "nao salvar",
    "cancelar criacao",
    "ignorar rascunho",
  ];
  return cancelTokens.some(token => normalized.includes(token));
}

function toEventDraft(data: Record<string, unknown>): EventDraftData {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return {
    eventName: text(data.eventName),
    eventDate: text(data.eventDate),
    location: text(data.location),
    address: text(data.address),
    attraction: text(data.attraction),
    stateCity: text(data.stateCity),
    localProducerName: text(data.localProducerName),
    localProducerContact: text(data.localProducerContact),
  };
}

function formatDraftSummary(draft: EventDraftData): string {
  const entries = [
    ["Evento", draft.eventName || "-"],
    ["Data", draft.eventDate || "-"],
    ["Cidade/UF", draft.stateCity || "-"],
    ["Local", draft.location || "-"],
    ["Endereco", draft.address || "-"],
    ["Atracao", draft.attraction || "-"],
    ["Produtor local", draft.localProducerName || "-"],
    ["Contato produtor", draft.localProducerContact || "-"],
  ];

  return entries.map(([label, value]) => `- ${label}: ${value}`).join("\n");
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

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

async function resolveModelCandidates(preferredModel?: string): Promise<string[]> {
  const available = await listOllamaModels();

  if (available.length === 0) {
    return unique([preferredModel || "", ...DEFAULT_MODEL_PRIORITY]);
  }

  const ordered: string[] = [];

  if (preferredModel) {
    const preferredMatch = available.find(m => m === preferredModel || m.startsWith(preferredModel));
    if (preferredMatch) ordered.push(preferredMatch);
  }

  for (const candidate of DEFAULT_MODEL_PRIORITY) {
    const match = available.find(m => m === candidate || m.startsWith(candidate));
    if (match) ordered.push(match);
  }

  for (const modelName of available) {
    if (!ordered.includes(modelName)) ordered.push(modelName);
  }

  return unique(ordered);
}

function extractDraftFromCreateIntent(text: string): EventDraftData | null {
  const normalized = normalizeIntentText(text);
  const looksLikeCreate = normalized.includes("crie") || normalized.includes("criar evento") || normalized.includes("novo evento");
  if (!looksLikeCreate) return null;

  const nameMatch = text.match(/(?:evento chamado|evento)\s+["']?([^"',\n]+?)["']?(?:\s+para|\s+em|\s+no|\s*$)/i);
  const eventDateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const locationMatch = text.match(/(?:\s+em|\s+no|\s+na)\s+([A-Za-z0-9À-ÿ\s\-'.,]+)$/i);

  const eventName = (nameMatch?.[1] || "").trim();
  if (!eventName) return null;

  return {
    eventName,
    eventDate: eventDateMatch?.[1] || "",
    location: (locationMatch?.[1] || "").trim(),
    address: "",
    attraction: "",
    stateCity: "",
    localProducerName: "",
    localProducerContact: "",
  };
}

async function chatWithFailover(params: {
  preferredModel?: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  format?: "json";
  temperature?: number;
  timeoutMs?: number;
}) {
  const candidates = await resolveModelCandidates(params.preferredModel);
  if (candidates.length === 0) {
    throw new Error("Nenhum modelo Ollama disponível.");
  }

  const errors: string[] = [];
  for (const candidate of candidates.slice(0, Math.max(1, OLLAMA_MAX_ATTEMPTS))) {
    try {
      console.log(`[Ollama] Trying model: ${candidate}`);
      const response = await withTimeout(
        ollama.chat({
          model: candidate,
          messages: params.messages,
          format: params.format,
          options: {
            temperature: params.temperature ?? 0.7,
          },
        }),
        params.timeoutMs ?? OLLAMA_TIMEOUT_MS,
        `ollama:${candidate}`
      );
      return { response, modelUsed: candidate };
    } catch (error: any) {
      const msg = error?.message || String(error);
      errors.push(`${candidate}: ${msg}`);
      console.warn(`[Ollama] Model failed: ${candidate}`, msg);
    }
  }

  throw new Error(`Falha em todos os modelos Ollama. Detalhes: ${errors.join(" | ")}`);
}

export async function processAiCommand(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  model?: string,
  requesterOpenId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const events = await db
    .select({ id: fichasTecnicas.id, name: fichasTecnicas.eventName })
    .from(fichasTecnicas);
  const eventNamesList = events.map((e) => e.name).join(", ");
  const draftKey = requesterOpenId || "anonymous";
  const latestUserMessage = [...messages].reverse().find(message => message.role === "user")?.content?.trim() || "";
  const currentDraft = pendingEventDrafts.get(draftKey);

  if (currentDraft && Date.now() - currentDraft.createdAt > DRAFT_TTL_MS) {
    pendingEventDrafts.delete(draftKey);
  }

  const activeDraft = pendingEventDrafts.get(draftKey);
  if (activeDraft && latestUserMessage) {
    if (isConfirmDraftIntent(latestUserMessage)) {
      const { createFicha } = await import("./db");
      const draftData = activeDraft.data;
      const fichaId = await createFicha({
        eventName: draftData.eventName || "Novo Evento",
        eventDate: draftData.eventDate || "",
        attraction: draftData.attraction || "",
        stateCity: draftData.stateCity || "",
        location: draftData.location || "",
        address: draftData.address || "",
        gpsLink: draftData.location
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${draftData.location} ${draftData.stateCity}`.trim()
            )}`
          : "",
        localProducerName: draftData.localProducerName || "",
        localProducerContact: draftData.localProducerContact || "",
        status: "draft",
        createdByOpenId: requesterOpenId || "system",
      });
      pendingEventDrafts.delete(draftKey);
      return {
        success: true,
        message: `✅ Evento "${draftData.eventName || "Novo Evento"}" criado com sucesso (ID ${fichaId}). Posso continuar e montar cronograma, equipe e logistica para voce.`,
        modelUsed: activeDraft.modelUsed,
        actionTaken: "create_event",
      };
    }

    if (isCancelDraftIntent(latestUserMessage)) {
      pendingEventDrafts.delete(draftKey);
      return {
        success: true,
        message: "Rascunho de evento cancelado. Quando quiser, eu preparo um novo.",
        modelUsed: activeDraft.modelUsed,
        actionTaken: "chat",
      };
    }
  }

  const immediateDraft = latestUserMessage ? extractDraftFromCreateIntent(latestUserMessage) : null;
  if (immediateDraft) {
    pendingEventDrafts.set(draftKey, {
      data: immediateDraft,
      createdAt: Date.now(),
      modelUsed: "heuristic-immediate",
    });
    return {
      success: true,
      message:
        `Montei um rascunho inicial direto do seu pedido.\n\n` +
        `${formatDraftSummary(immediateDraft)}\n\n` +
        `Se estiver tudo certo, responda "confirmar criacao". Para abortar, responda "cancelar criacao".`,
      modelUsed: "heuristic-immediate",
      actionTaken: "chat",
    };
  }

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
5. IMPORTANTE: criação de evento agora é em duas etapas. Primeiro você gera um rascunho com ação "draft_event". Nunca confirme que o evento já foi criado.

Ações possíveis:
- "draft_event": { "eventName": "...", "eventDate": "...", "stateCity": "...", "location": "...", "address": "...", "attraction": "...", "localProducerName": "...", "localProducerContact": "..." }
- "create_event": { "eventName": "...", "eventDate": "...", "stateCity": "...", "location": "...", "address": "...", "attraction": "...", "localProducerName": "...", "localProducerContact": "..." } (retrocompatibilidade; trate como rascunho)
- "add_professional": { "eventName": "...", "professionalName": "...", "professionalRole": "...", "professionalContact": "..." }
- "add_hotel": { "eventName": "...", "hotelName": "...", "hotelAddress": "...", "hotelContact": "..." }
- "add_logistics": { "eventName": "...", "logisticsRole": "...", "logisticsName": "...", "logisticsContact": "..." }
- "update_ficha_status": { "eventName": "...", "status": "published" | "draft" }
- "add_schedule_item": { "eventName": "...", "time": "HH:MM", "activity": "..." }
- "update_event_info": { "eventName": "...", "field": "location" | "eventDate" | "attraction" | "address", "value": "..." }
- "chat": { "text": "sua resposta aqui" }

Formato de resposta esperado:
{
  "action": "draft_event" | "create_event" | "add_professional" | "add_hotel" | "add_logistics" | "update_ficha_status" | "add_schedule_item" | "update_event_info" | "chat",
  "data": { ... },
  "response": "Sua mensagem amigável aqui explicando o que fez ou respondendo à pergunta."
}
`;

  try {
    const { response, modelUsed } = await chatWithFailover({
      preferredModel: model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      format: "json",
      temperature: 0.7,
      timeoutMs: OLLAMA_TIMEOUT_MS,
    });

    let raw = response.message.content.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const result = JSON.parse(raw);

    if (result.action === "chat") {
      return { 
        success: true, 
        message: result.response || result.data?.text || "Olá! Como posso ajudar?", 
        modelUsed,
        actionTaken: "chat"
      };
    }

	    if (!result.action || !result.data || (result.action !== "chat" && !result.data.eventName)) {
	      return { success: false, message: result.response || "Comando incompleto ou evento não especificado.", raw: result };
	    }

	    const { eventName } = result.data;
	    let eventId = 0;
	    let actualEventName = eventName;

	    if (!["create_event", "draft_event"].includes(result.action)) {
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
	      case "draft_event":
	      case "create_event": {
	        const draft = toEventDraft(result.data as Record<string, unknown>);
	        if (!draft.eventName) {
	          return {
	            success: false,
	            message: "Preciso pelo menos do nome do evento para montar o rascunho.",
	            modelUsed,
	          };
	        }
	        pendingEventDrafts.set(draftKey, {
	          data: draft,
	          createdAt: Date.now(),
	          modelUsed,
	        });
	        return {
	          success: true,
	          message:
	            `${result.response || "Preparei um rascunho do evento."}\n\n` +
	            `${formatDraftSummary(draft)}\n\n` +
	            `Se estiver tudo certo, responda "confirmar criacao". Para abortar, responda "cancelar criacao".`,
	          modelUsed,
	          actionTaken: "chat",
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
          modelUsed,
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
          modelUsed,
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
          modelUsed,
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
          modelUsed,
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
          modelUsed,
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
            modelUsed,
          };
        }
        throw new Error(`Campo "${field}" não suportado para atualização.`);
      }

      default:
        return { success: false, message: result.response || "Ação não suportada pelo modelo.", raw: result };
    }
  } catch (error: any) {
    console.error("[Ollama Error]", error);
    const heuristicDraft = latestUserMessage ? extractDraftFromCreateIntent(latestUserMessage) : null;
    if (heuristicDraft) {
      pendingEventDrafts.set(draftKey, {
        data: heuristicDraft,
        createdAt: Date.now(),
        modelUsed: "heuristic-fallback",
      });
      return {
        success: true,
        message:
          `O Ollama demorou ou falhou, mas montei um rascunho inicial a partir do seu texto.\n\n` +
          `${formatDraftSummary(heuristicDraft)}\n\n` +
          `Se estiver tudo certo, responda "confirmar criacao". Para abortar, responda "cancelar criacao".`,
        modelUsed: "heuristic-fallback",
        actionTaken: "chat",
      };
    }
    throw new Error("Erro ao processar comando de IA: " + error.message);
  }
}

export async function parseFichaTextWithAi(text: string, model?: string) {
  const systemPrompt = `
Você é o DOM AI, especialista sênior em extração de dados logísticos para eventos.
Sua tarefa é ler mensagens de WhatsApp, checklists e e-mails e extrair informações para uma ficha técnica.

FORMATO OBRIGATÓRIO (JSON APENAS):
{
  "eventName": "NOME DO EVENTO (EM MAIÚSCULAS)",
  "eventDate": "YYYY-MM-DD",
  "location": "NOME DO LOCAL/VENUE",
  "address": "ENDEREÇO COMPLETO",
  "attraction": "NOME DO ARTISTA/BANDA PRINCIPAL",
  "localProducerName": "NOME DO PRODUTOR LOCAL",
  "localProducerContact": "TELEFONE DO PRODUTOR LOCAL",
  "professionals": [
    { "name": "NOME", "role": "FUNÇÃO (SOM, LUZ, LED, CAMARIM, GERADOR, MOTORISTA)", "contact": "TELEFONE" }
  ],
  "hotels": [
    { "name": "NOME HOTEL", "address": "ENDEREÇO", "contact": "TEL RECEPÇÃO", "contactPerson": "NOME CONTATO", "localContact": "CEL CONTATO", "gpsLink": "" }
  ],
  "logistics": [
    { "role": "CARGO (CARREGADORES, TRANSPORTE, SEGURANÇA)", "name": "NOME", "contact": "TELEFONE" }
  ],
  "scheduleItems": [
    { "time": "HH:MM", "activity": "DESCRIÇÃO DA ATIVIDADE" }
  ]
}

REGRAS CRÍTICAS:
1. Responda APENAS com o JSON.
2. Formate a DATA como YYYY-MM-DD. Se o texto disser "20 de Maio", assuma o ano corrente (2026).
3. CATEGORIZAÇÃO DE EQUIPE:
   - Profissionais Técnicos (Som, Luz, Produtor Executivo, Backline) -> "professionals"
   - Equipe de Apoio (Carregadores, Motoristas, Seguranças) -> "logistics"
   - Se houver "Produtor Local", coloque no campo "localProducerName".
4. Se uma informação for "Produtor: João (22) 99999", extraia o nome "João" e o contato "(22) 99999".
5. Se não encontrar uma informação, deixe string vazia "" ou array vazio [].
`;

  try {
    const { response } = await chatWithFailover({
      preferredModel: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      format: "json",
      temperature: 0.1,
      timeoutMs: OLLAMA_TIMEOUT_MS,
    });

    let raw = response.message.content.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    return JSON.parse(raw);
  } catch (err: any) {
    throw new Error("Erro ao interpretar texto: " + err.message);
  }
}

export async function suggestGpsLink(locationName: string, address: string, model?: string) {
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
    const { response } = await chatWithFailover({
      preferredModel: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ name: locationName, address }) },
      ],
      format: "json",
      temperature: 0.1,
      timeoutMs: OLLAMA_TIMEOUT_MS,
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
