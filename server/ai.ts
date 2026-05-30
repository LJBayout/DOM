import { getDb } from "./db";
import { fichasTecnicas } from "../drizzle/schema";
const DRAFT_TTL_MS = 30 * 60 * 1000;

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
const draftTemplateCursorByRequester = new Map<string, number>();

type MockEventTemplate = {
  eventName: string;
  dayOffset: number;
  stateCity: string;
  location: string;
  address: string;
  attraction: string;
  localProducerName: string;
  localProducerContact: string;
};

const MOCK_EVENT_TEMPLATES: MockEventTemplate[] = [
  {
    eventName: "LOLLAPALOOZA BRASIL",
    dayOffset: 25,
    stateCity: "São Paulo/SP",
    location: "Autódromo de Interlagos",
    address: "Av. Sen. Teotônio Vilela, 261 - Interlagos, São Paulo - SP",
    attraction: "Sabrina Carpenter, Tyler The Creator, Chappell Roan",
    localProducerName: "Lucas Mendes",
    localProducerContact: "(11) 97722-3344",
  },
  {
    eventName: "ROCK IN RIO",
    dayOffset: 98,
    stateCity: "Rio de Janeiro/RJ",
    location: "Cidade do Rock - Parque Olímpico",
    address: "Av. Embaixador Abelardo Bueno, s/n - Barra da Tijuca, Rio de Janeiro - RJ",
    attraction: "Foo Fighters, Elton John, Stray Kids, Maroon 5",
    localProducerName: "Roberta Silva",
    localProducerContact: "(21) 98855-6677",
  },
  {
    eventName: "UNIVERSO PARALELO",
    dayOffset: 212,
    stateCity: "Ituberá/BA",
    location: "Praia de Pratigi",
    address: "Praia de Pratigi, Ituberá - BA",
    attraction: "Artistas Psytrance Internacionais",
    localProducerName: "Tatiana Costa",
    localProducerContact: "(71) 99666-1122",
  },
  {
    eventName: "MONSTERS OF ROCK",
    dayOffset: 40,
    stateCity: "São Paulo/SP",
    location: "Estádio do Morumbi",
    address: "Av. Giovanni Gronchi, 7463 - Morumbi, São Paulo - SP",
    attraction: "Guns N' Roses",
    localProducerName: "Fernando Rocha",
    localProducerContact: "(11) 95544-7788",
  },
  {
    eventName: "JOÃO ROCK",
    dayOffset: 35,
    stateCity: "Ribeirão Preto/SP",
    location: "Parque Permanente de Exposições",
    address: "Av. Maurílio Biagi Filho, s/n - Ribeirânia, Ribeirão Preto - SP",
    attraction: "Nacional e Internacional Rock",
    localProducerName: "Juliana Barros",
    localProducerContact: "(16) 99111-2233",
  },
  {
    eventName: "TOMORROWLAND BRASIL",
    dayOffset: 65,
    stateCity: "Itu/SP",
    location: "Parque Maeda",
    address: "Rodovia Dep. Archimedes Lammoglia, Km 24 - Itu - SP",
    attraction: "Artistas Eletrônicos Internacionais",
    localProducerName: "Marcelo Santos",
    localProducerContact: "(11) 98877-4455",
  },
  {
    eventName: "PLANETA ATLÂNTIDA",
    dayOffset: 50,
    stateCity: "Osório/RS",
    location: "Atlântida",
    address: "Av. Central, s/n - Atlântida, Osório - RS",
    attraction: "Line-up Verão Gaúcho",
    localProducerName: "Camila Duarte",
    localProducerContact: "(51) 99777-8899",
  },
  {
    eventName: "FESTIVAL DE VERÃO SALVADOR",
    dayOffset: 45,
    stateCity: "Salvador/BA",
    location: "Parque de Exposições",
    address: "Av. Paralela, s/n - Salvador - BA",
    attraction: "Axé e Artistas Nacionais/Internacionais",
    localProducerName: "Rafael Mendes",
    localProducerContact: "(71) 99444-5566",
  },
  {
    eventName: "PRIMAVERA SOUND SÃO PAULO",
    dayOffset: 190,
    stateCity: "São Paulo/SP",
    location: "Autódromo de Interlagos",
    address: "Av. Sen. Teotônio Vilela, 261 - Interlagos, São Paulo - SP",
    attraction: "Gorillaz e Internacionais",
    localProducerName: "Ana Paula Costa",
    localProducerContact: "(11) 96666-7788",
  },
  {
    eventName: "C6 FEST",
    dayOffset: 70,
    stateCity: "São Paulo/SP",
    location: "Parque Ibirapuera",
    address: "Av. Pedro Álvares Cabral, s/n - Vila Mariana, São Paulo - SP",
    attraction: "Robert Plant, The xx",
    localProducerName: "Bruno Lima",
    localProducerContact: "(11) 97788-9900",
  },
  {
    eventName: "ROCK THE MOUNTAIN",
    dayOffset: 155,
    stateCity: "Petrópolis/RJ",
    location: "Parque de Itaipava",
    address: "Estrada União Industrial, 10000 - Itaipava, Petrópolis - RJ",
    attraction: "Jorja Smith, Ivete Sangalo",
    localProducerName: "Larissa Ferreira",
    localProducerContact: "(24) 98822-3344",
  },
  {
    eventName: "NÔMADE FESTIVAL",
    dayOffset: 55,
    stateCity: "São Paulo/SP",
    location: "Parque Villa-Lobos",
    address: "Av. Prof. Fonseca Rodrigues, 2001 - Alto de Pinheiros, São Paulo - SP",
    attraction: "Line-up Nacional e Internacional",
    localProducerName: "Diego Oliveira",
    localProducerContact: "(11) 95533-2211",
  },
  {
    eventName: "COSQUIN ROCK BRASIL",
    dayOffset: 15,
    stateCity: "Florianópolis/SC",
    location: "Stage Music Park",
    address: "Rod. Jornalista Maurício Sirotsky Sobrinho, s/n - Jurerê, Florianópolis - SC",
    attraction: "Rock Internacional e Nacional",
    localProducerName: "Sofia Almeida",
    localProducerContact: "(48) 99655-4433",
  },
  {
    eventName: "DOCE MARAVILHA",
    dayOffset: 75,
    stateCity: "Rio de Janeiro/RJ",
    location: "Jockey Club",
    address: "Rua Jardim Botânico, 1003 - Jardim Botânico, Rio de Janeiro - RJ",
    attraction: "Artistas Multigênero",
    localProducerName: "Pedro Henrique",
    localProducerContact: "(21) 97744-1122",
  },
  {
    eventName: "ARENA BRASILEIRA",
    dayOffset: 45,
    stateCity: "São Paulo/SP",
    location: "Parque Ibirapuera",
    address: "Av. Pedro Álvares Cabral, s/n - Vila Mariana, São Paulo - SP",
    attraction: "Anitta, Ludmilla e mais",
    localProducerName: "Mariana Costa",
    localProducerContact: "(11) 98811-2201",
  },
  {
    eventName: "WARUNG DAY FESTIVAL",
    dayOffset: 80,
    stateCity: "Itu/SP",
    location: "Complexo Warung",
    address: "Rodovia SP-300, Km 30 - Itu - SP",
    attraction: "Eletrônica Internacional",
    localProducerName: "Vinicius Rocha",
    localProducerContact: "(11) 99922-3344",
  },
  {
    eventName: "GOP TUN FESTIVAL",
    dayOffset: 60,
    stateCity: "São Paulo/SP",
    location: "Local a Confirmar",
    address: "São Paulo - SP",
    attraction: "Eletrônica Underground",
    localProducerName: "Julia Santos",
    localProducerContact: "(11) 97755-6677",
  },
  {
    eventName: "FESTIVAL DA LUA CHEIA",
    dayOffset: 40,
    stateCity: "Altinópolis/SP",
    location: "Hotel Fazenda Vale das Grutas",
    address: "Altinópolis - SP",
    attraction: "Multigênero",
    localProducerName: "Thiago Nery",
    localProducerContact: "(16) 99633-2211",
  },
  {
    eventName: "VILLAGE RIO",
    dayOffset: 35,
    stateCity: "Rio de Janeiro/RJ",
    location: "Village Rio",
    address: "Av. Infante Dom Henrique, s/n - Glória, Rio de Janeiro - RJ",
    attraction: "Anitta, Vintage Culture",
    localProducerName: "Amanda Freitas",
    localProducerContact: "(21) 99433-5502",
  },
  {
    eventName: "AME LAROC FESTIVAL",
    dayOffset: 55,
    stateCity: "Valinhos/SP",
    location: "Complexo Laroc",
    address: "Valinhos - SP",
    attraction: "Eletrônica Internacional",
    localProducerName: "Helena Prado",
    localProducerContact: "(19) 99601-8832",
  },
];

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

function isOneClickCreateIntent(text: string): boolean {
  const normalized = normalizeIntentText(text);
  return (
    normalized === "criar rascunho" ||
    normalized === "criar rascunho de evento completo" ||
    normalized.includes("criar rascunho de evento completo")
  );
}

function readObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function compactRows<T>(items: T[], fallback: T[]): T[] {
  return items.length > 0 ? items : fallback;
}

function getNextTemplateIndex(requesterKey: string): number {
  const current = draftTemplateCursorByRequester.get(requesterKey) ?? -1;
  const next = (current + 1) % MOCK_EVENT_TEMPLATES.length;
  draftTemplateCursorByRequester.set(requesterKey, next);
  return next;
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

function buildMockEventDraft(seed: Partial<EventDraftData> = {}, templateIndex = 0): EventDraftData {
  const defaultDate = new Date();
  const template = MOCK_EVENT_TEMPLATES[Math.max(0, Math.min(templateIndex, MOCK_EVENT_TEMPLATES.length - 1))];
  defaultDate.setDate(defaultDate.getDate() + template.dayOffset);
  const eventName = seed.eventName?.trim() || template.eventName;
  const eventDate = seed.eventDate?.trim() || defaultDate.toISOString().slice(0, 10);
  const location = seed.location?.trim() || template.location;
  const address = seed.address?.trim() || template.address;
  const attraction = seed.attraction?.trim() || template.attraction;
  const stateCity = seed.stateCity?.trim() || template.stateCity;
  const localProducerName = seed.localProducerName?.trim() || template.localProducerName;
  const localProducerContact = seed.localProducerContact?.trim() || template.localProducerContact;

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

function extractDraftFromCreateIntent(text: string, requesterKey: string): EventDraftData | null {
  if (isCancelDraftIntent(text)) return null;

  const normalized = normalizeIntentText(text);
  const looksLikeCreate =
    (normalized.includes("cria") && normalized.includes("evento")) ||
    normalized.includes("criar evento") ||
    normalized.includes("novo evento") ||
    normalized.includes("rascunho de evento") ||
    normalized.includes("evento rascunho") ||
    normalized.includes("evento teste") ||
    normalized.includes("create event");

  if (!looksLikeCreate) return null;

  const namedByLabel = text.match(/evento chamado\s+["']?([^"',\n]+?)["']?(?:\s+para|\s+em|\s+no|\s*$)/i);
  const namedByQuotes = text.match(/evento\s+["']([^"'\n]+)["']/i);
  const eventDateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const locationMatch = text.match(/(?:\s+em|\s+no|\s+na)\s+([A-Za-z0-9À-ÿ\s\-'.,]+)$/i);
  const locationCandidate = locationMatch?.[1]?.trim() || "";
  const normalizedLocation = normalizeIntentText(locationCandidate);
  const normalizedIsLanguage = normalizedLocation === "portugues";
  const templateIndex = getNextTemplateIndex(requesterKey);

  return buildMockEventDraft({
    eventName: namedByLabel?.[1]?.trim() || namedByQuotes?.[1]?.trim() || "",
    eventDate: eventDateMatch?.[1] || "",
    location: normalizedIsLanguage ? "" : locationCandidate,
  }, templateIndex);
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

  const immediateDraft = latestUserMessage ? extractDraftFromCreateIntent(latestUserMessage, draftKey) : null;
  if (immediateDraft) {
    if (isOneClickCreateIntent(latestUserMessage)) {
      const { createFicha, replaceHotels, replaceLogistics, replaceProfessionals, replaceScheduleItems } = await import("./db");
      const fichaId = await createFicha({
        eventName: immediateDraft.eventName || "Novo Evento",
        eventDate: immediateDraft.eventDate || "",
        attraction: immediateDraft.attraction || "",
        stateCity: immediateDraft.stateCity || "",
        location: immediateDraft.location || "",
        address: immediateDraft.address || "",
        gpsLink: immediateDraft.location
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${immediateDraft.location} ${immediateDraft.stateCity}`.trim()
            )}`
          : "",
        localProducerName: immediateDraft.localProducerName || "",
        localProducerContact: immediateDraft.localProducerContact || "",
        status: "draft",
        createdByOpenId: requesterOpenId || "system",
      });
      await Promise.all([
        replaceScheduleItems(fichaId, immediateDraft.scheduleItems),
        replaceProfessionals(fichaId, immediateDraft.professionals),
        replaceHotels(fichaId, immediateDraft.hotels),
        replaceLogistics(fichaId, immediateDraft.logistics),
      ]);
      return {
        success: true,
        message:
          `✅ Evento "${immediateDraft.eventName}" criado com sucesso (ID ${fichaId}).\n\n` +
          `${formatDraftSummary(immediateDraft)}`,
        modelUsed: "heuristic-one-click",
        actionTaken: "create_event",
      };
    }

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
        `Se estiver tudo certo, responda "confirmar criacao". Para abortar, responda "cancelar criacao". Para outro evento mock, clique em "Criar rascunho" novamente.`,
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
  if (latestUserMessage) {
    const normalized = normalizeIntentText(latestUserMessage);
    if (normalized.includes("preencher ficha") || normalized.includes("ficha tecnica") || normalized.includes("ficha técnica")) {
      return {
        success: true,
        message:
          "Para preencher a ficha, cole o texto do WhatsApp ou do checklist na tela da ficha técnica. Eu vou organizar os campos automaticamente.",
        modelUsed: "local-rules",
        actionTaken: "chat",
      };
    }
    if (normalized.includes("montar cronograma") || normalized.includes("cronograma")) {
      return {
        success: true,
        message:
          "Posso montar o cronograma na ficha técnica. Se quiser, use o formulário do evento e eu te ajudo a organizar os horários e atividades.",
        modelUsed: "local-rules",
        actionTaken: "chat",
      };
    }
    if (normalized.includes("adicionar profissional") || normalized.includes("profissional")) {
      return {
        success: true,
        message:
          "Para adicionar profissionais, abra a ficha do evento e inclua nome, função e contato. Se quiser criar um rascunho completo, eu posso montar um novo evento para você.",
        modelUsed: "local-rules",
        actionTaken: "chat",
      };
    }
    if (normalized.includes("hotel")) {
      return {
        success: true,
        message:
          "Para hotéis, eu posso sugerir a estrutura ideal da ficha: nome, endereço, contato, responsável local e link de GPS.",
        modelUsed: "local-rules",
        actionTaken: "chat",
      };
    }
    if (normalized.includes("logistica") || normalized.includes("logística")) {
      return {
        success: true,
        message:
          "Na logística, o ideal é registrar função, nome e contato de cada responsável. Se quiser, eu monto um rascunho completo do evento com essa estrutura.",
        modelUsed: "local-rules",
        actionTaken: "chat",
      };
    }
  }

  return {
    success: true,
    message:
      `Estou sem modelo externo agora, mas ainda posso ajudar com rascunhos e regras locais.\n\n` +
      `Eventos cadastrados hoje: ${eventNamesContext}.\n` +
      `Se quiser criar um rascunho completo, diga "criar evento" com nome, data ou cidade. Se quiser fechar a conversa, diga "cancelar criacao".`,
    modelUsed: "local-rules",
    actionTaken: "chat",
  };
}

export async function parseFichaTextWithAi(text: string) {
  const eventNameMatch = text.match(/(?:evento|show|festival|festa)\s+(?:chamado|de)?\s*["']?([^"\n,]+)["']?/i);
  const dateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const cityMatch = text.match(/(?:em|na|no)\s+([A-Za-zÀ-ÿ\s-]+?)(?:,|\.|$)/i);
  const attractionMatch = text.match(/(?:atração|atracao|artista|banda)\s*:?\s*([A-Za-zÀ-ÿ0-9\s-]+?)(?:,|\.|$)/i);
  const phoneMatch = text.match(/(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/);
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const scheduleItems = lines
    .filter(line => /\b\d{1,2}:\d{2}\b/.test(line))
    .slice(0, 8)
    .map(line => {
      const [time, ...rest] = line.split(/\s+/);
      return { time: time.replace(/\D/g, "").padStart(4, "0").replace(/^(\d{2})(\d{2})$/, "$1:$2"), activity: rest.join(" ").replace(/^[-:]\s*/, "") || "Atividade" };
    });

  return {
    eventName: (eventNameMatch?.[1] || "EVENTO RASCUNHO DOM AI").trim().toUpperCase(),
    eventDate: dateMatch?.[1] || "",
    location: cityMatch?.[1]?.trim() || "",
    address: "",
    attraction: attractionMatch?.[1]?.trim() || "",
    localProducerName: "",
    localProducerContact: phoneMatch?.[1] || "",
    professionals: [],
    hotels: [],
    logistics: [],
    scheduleItems: scheduleItems.length > 0 ? scheduleItems : [{ time: "09:00", activity: "Abertura de operação" }],
  };
}

export async function suggestGpsLink(locationName: string, address: string) {
  const query = `${locationName} ${address}`.trim();
  const encoded = encodeURIComponent(query);
  return {
    query,
    refinedName: locationName.trim(),
    refinedAddress: address.trim(),
    url: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
}
