import { Ollama } from "ollama";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { fichasTecnicas, professionals } from "../drizzle/schema";
import { like } from "drizzle-orm";

const ollama = new Ollama({ host: ENV.ollamaUrl });
const DOM_AI_MODEL = "dom-ai";
const DRAFT_TTL_MS = 30 * 60 * 1000;
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 12000);

type DraftScheduleItem = { time: string; activity: string };
type DraftProfessional = { name: string; role: string; contact: string };
type DraftHotel = {
  name: string;
  address: string;
  contact: string;
  contactPerson: string;
  localContact: string;
  gpsLink: string;
  roomListPdfs: string | null;
};
type DraftLogisticsItem = { role: string; name: string; contact: string };

type EventDraftData = {
  eventName: string;
  eventDate: string;
  location: string;
  address: string;
  attraction: string;
  stateCity: string;
  localProducerName: string;
  localProducerContact: string;
  scheduleItems: DraftScheduleItem[];
  professionals: DraftProfessional[];
  hotels: DraftHotel[];
  logistics: DraftLogisticsItem[];
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

function readObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function compactRows<T>(items: T[], fallback: T[]): T[] {
  return items.length > 0 ? items : fallback;
}

function toScheduleItems(value: unknown, fallback: DraftScheduleItem[]) {
  const text = (item: Record<string, unknown>, key: string) => typeof item[key] === "string" ? item[key].trim() : "";
  const rows = readObjectArray(value)
    .map(item => ({ time: text(item, "time"), activity: text(item, "activity") }))
    .filter(item => item.time || item.activity);
  return compactRows(rows, fallback);
}

function toProfessionals(value: unknown, fallback: DraftProfessional[]) {
  const text = (item: Record<string, unknown>, key: string) => typeof item[key] === "string" ? item[key].trim() : "";
  const rows = readObjectArray(value)
    .map(item => ({ name: text(item, "name"), role: text(item, "role"), contact: text(item, "contact") }))
    .filter(item => item.name || item.role || item.contact);
  return compactRows(rows, fallback);
}

function toHotels(value: unknown, fallback: DraftHotel[]) {
  const text = (item: Record<string, unknown>, key: string) => typeof item[key] === "string" ? item[key].trim() : "";
  const rows = readObjectArray(value)
    .map(item => ({
      name: text(item, "name"),
      address: text(item, "address"),
      contact: text(item, "contact"),
      contactPerson: text(item, "contactPerson"),
      localContact: text(item, "localContact"),
      gpsLink: text(item, "gpsLink"),
      roomListPdfs: null,
    }))
    .filter(item => item.name || item.address || item.contact);
  return compactRows(rows, fallback);
}

function toLogistics(value: unknown, fallback: DraftLogisticsItem[]) {
  const text = (item: Record<string, unknown>, key: string) => typeof item[key] === "string" ? item[key].trim() : "";
  const rows = readObjectArray(value)
    .map(item => ({ role: text(item, "role"), name: text(item, "name"), contact: text(item, "contact") }))
    .filter(item => item.role || item.name || item.contact);
  return compactRows(rows, fallback);
}

function toEventDraft(data: Record<string, unknown>): EventDraftData {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const seededDraft = buildMockEventDraft({
    eventName: text(data.eventName),
    eventDate: text(data.eventDate),
    location: text(data.location),
    address: text(data.address),
    attraction: text(data.attraction),
    stateCity: text(data.stateCity),
    localProducerName: text(data.localProducerName),
    localProducerContact: text(data.localProducerContact),
  });

  return {
    ...seededDraft,
    scheduleItems: toScheduleItems(data.scheduleItems, seededDraft.scheduleItems),
    professionals: toProfessionals(data.professionals, seededDraft.professionals),
    hotels: toHotels(data.hotels, seededDraft.hotels),
    logistics: toLogistics(data.logistics, seededDraft.logistics),
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
    ["Cronograma", `${draft.scheduleItems.length} itens`],
    ["Profissionais", `${draft.professionals.length} contatos`],
    ["Hotel", draft.hotels[0]?.name || "-"],
    ["Logistica", `${draft.logistics.length} itens`],
  ];

  return entries.map(([label, value]) => `- ${label}: ${value}`).join("\n");
}

function buildMockEventDraft(seed: Partial<EventDraftData> = {}): EventDraftData {
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 21);
  const eventName = seed.eventName?.trim() || "EVENTO MOCK DOM AI";
  const eventDate = seed.eventDate?.trim() || defaultDate.toISOString().slice(0, 10);
  const location = seed.location?.trim() || "Espaço DOM Arena";
  const address = seed.address?.trim() || "Av. Paulista, 1000 - Bela Vista, São Paulo - SP";
  const attraction = seed.attraction?.trim() || "Artista Teste";
  const stateCity = seed.stateCity?.trim() || "São Paulo/SP";
  const localProducerName = seed.localProducerName?.trim() || "Produtor Mock DOM";
  const localProducerContact = seed.localProducerContact?.trim() || "(11) 99999-0000";

  return {
    eventName,
    eventDate,
    location,
    address,
    attraction,
    stateCity,
    localProducerName,
    localProducerContact,
    scheduleItems: seed.scheduleItems?.length ? seed.scheduleItems : [
      { time: "09:00", activity: "Abertura de backstage" },
      { time: "11:00", activity: "Chegada da equipe técnica" },
      { time: "13:00", activity: "Montagem de palco, luz e áudio" },
      { time: "16:00", activity: "Passagem de som" },
      { time: "19:00", activity: "Abertura dos portões" },
      { time: "22:00", activity: `Show principal: ${attraction}` },
      { time: "23:30", activity: "Desmontagem e conferência final" },
    ],
    professionals: seed.professionals?.length ? seed.professionals : [
      { name: "Coord. Técnico DOM", role: "Direção Técnica", contact: "(11) 90000-0001" },
      { name: "Coord. Luz", role: "Iluminação", contact: "(11) 90000-0002" },
      { name: "Coord. Áudio", role: "Áudio PA", contact: "(11) 90000-0003" },
      { name: "Produtor Executivo", role: "Produção Executiva", contact: "(11) 90000-0004" },
    ],
    hotels: seed.hotels?.length ? seed.hotels : [
      {
        name: "Hotel Oficial Produção",
        address: `Hotel central próximo a ${location}, ${stateCity}`,
        contact: "(11) 4000-1000",
        contactPerson: "Gerência de Eventos",
        localContact: "(11) 95555-1000",
        gpsLink: `https://maps.google.com/?q=${encodeURIComponent(`Hotel oficial ${stateCity}`)}`,
        roomListPdfs: null,
      },
    ],
    logistics: seed.logistics?.length ? seed.logistics : [
      { role: "Produtor Local", name: localProducerName, contact: localProducerContact },
      { role: "Transporte", name: "Equipe de Transporte", contact: "(11) 94444-2000" },
      { role: "Segurança", name: "Coordenação de Segurança", contact: "(11) 93333-3000" },
      { role: "Carregadores", name: "Equipe de Carga", contact: "(11) 92222-4000" },
    ],
  };
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

function extractDraftFromCreateIntent(text: string): EventDraftData | null {
  if (isCancelDraftIntent(text)) return null;

  const normalized = normalizeIntentText(text);
  const looksLikeCreate =
    (normalized.includes("cria") && normalized.includes("evento")) ||
    normalized.includes("criar evento") ||
    normalized.includes("novo evento") ||
    normalized.includes("mock de evento") ||
    normalized.includes("evento mock") ||
    normalized.includes("evento teste") ||
    normalized.includes("create event");

  if (!looksLikeCreate) return null;

  const nameMatch = text.match(/(?:evento chamado|evento)\s+["']?([^"',\n]+?)["']?(?:\s+para|\s+em|\s+no|\s*$)/i);
  const eventDateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const locationMatch = text.match(/(?:\s+em|\s+no|\s+na)\s+([A-Za-z0-9À-ÿ\s\-'.,]+)$/i);

  return buildMockEventDraft({
    eventName: nameMatch?.[1]?.trim() || "",
    eventDate: eventDateMatch?.[1] || "",
    location: locationMatch?.[1]?.trim() || "",
  });
}

async function chatWithDomAi(params: {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  format?: "json";
  temperature?: number;
  timeoutMs?: number;
}) {
  try {
    const response = await withTimeout(
      ollama.chat({
        model: DOM_AI_MODEL,
        messages: params.messages,
        format: params.format,
        options: {
          temperature: params.temperature ?? 0.2,
        },
      }),
      params.timeoutMs ?? OLLAMA_TIMEOUT_MS,
      `dom-ai:${DOM_AI_MODEL}`
    );
    return { response, modelUsed: DOM_AI_MODEL };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.warn(`[DOM AI] Model failed: ${DOM_AI_MODEL}`, msg);
    throw new Error(`DOM AI indisponivel: ${msg}`);
  }
}

export async function processAiCommand(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  requesterOpenId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const draftKey = requesterOpenId || "anonymous";
  const latestUserMessage = [...messages].reverse().find(message => message.role === "user")?.content?.trim() || "";
  const currentDraft = pendingEventDrafts.get(draftKey);

  if (currentDraft && Date.now() - currentDraft.createdAt > DRAFT_TTL_MS) {
    pendingEventDrafts.delete(draftKey);
  }

  const activeDraft = pendingEventDrafts.get(draftKey);
  if (activeDraft && latestUserMessage) {
    if (isConfirmDraftIntent(latestUserMessage)) {
      const { createFicha, replaceHotels, replaceLogistics, replaceProfessionals, replaceScheduleItems } = await import("./db");
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
      await Promise.all([
        replaceScheduleItems(fichaId, draftData.scheduleItems),
        replaceProfessionals(fichaId, draftData.professionals),
        replaceHotels(fichaId, draftData.hotels),
        replaceLogistics(fichaId, draftData.logistics),
      ]);
      pendingEventDrafts.delete(draftKey);
      return {
        success: true,
        message: `✅ Evento "${draftData.eventName || "Novo Evento"}" criado com sucesso (ID ${fichaId}) com cronograma, equipe, hotel e logística preenchidos.`,
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

  const events = await db
    .select({ id: fichasTecnicas.id, name: fichasTecnicas.eventName })
    .from(fichasTecnicas);
  const eventNamesList = events
    .slice(0, 20)
    .map((e) => e.name)
    .join(", ");
  const eventNamesContext = eventNamesList || "nenhum evento cadastrado ainda";

  const systemPrompt = `
Você é o DOM AI da DOM Produções.
Você conhece este projeto: fichas técnicas de eventos, profissionais, hotéis, logística, cronogramas e status draft/published.

Contexto atual:
Eventos cadastrados: [${eventNamesContext}]

Regras:
1. Responda APENAS com JSON válido.
2. Se o usuário pedir para criar um evento e faltar informação, produza um mock realista e completo em formato draft_event.
3. Se o usuário estiver só conversando, use "chat".
4. Nunca afirme que um evento foi criado de fato; a criação real só acontece depois do usuário confirmar.
5. No campo "response", escreva uma mensagem curta e amigável.

Formato de resposta:
{
  "action": "draft_event" | "create_event" | "add_professional" | "add_hotel" | "add_logistics" | "update_ficha_status" | "add_schedule_item" | "update_event_info" | "chat",
  "data": {
    "eventName": "NOME DO EVENTO",
    "eventDate": "YYYY-MM-DD",
    "stateCity": "Cidade/UF",
    "location": "Nome do local",
    "address": "Endereco completo",
    "attraction": "Atracao principal",
    "localProducerName": "Nome do produtor local",
    "localProducerContact": "Telefone do produtor local",
    "scheduleItems": [{ "time": "HH:MM", "activity": "Atividade" }],
    "professionals": [{ "name": "Nome", "role": "Funcao", "contact": "Telefone" }],
    "hotels": [{ "name": "Hotel", "address": "Endereco", "contact": "Telefone", "contactPerson": "Contato", "localContact": "Celular", "gpsLink": "" }],
    "logistics": [{ "role": "Funcao", "name": "Nome/equipe", "contact": "Telefone" }]
  },
  "response": "..."
}
`;

  try {
    const { response, modelUsed } = await chatWithDomAi({
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      format: "json",
      temperature: 0.2,
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
    console.error("[DOM AI Error]", error);
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
          `O DOM AI demorou ou falhou, mas montei um rascunho inicial a partir do seu texto.\n\n` +
          `${formatDraftSummary(heuristicDraft)}\n\n` +
          `Se estiver tudo certo, responda "confirmar criacao". Para abortar, responda "cancelar criacao".`,
        modelUsed: "heuristic-fallback",
        actionTaken: "chat",
      };
    }
    throw new Error("Erro ao processar comando do DOM AI: " + error.message);
  }
}

export async function parseFichaTextWithAi(text: string) {
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
    const { response } = await chatWithDomAi({
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

export async function suggestGpsLink(locationName: string, address: string) {
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
    const { response } = await chatWithDomAi({
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
