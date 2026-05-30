import "dotenv/config";
import { inArray } from "drizzle-orm";
import { getDb } from "../server/db";
import { fichasTecnicas, hotels, logistics, professionals, scheduleItems } from "../drizzle/schema";

type InternetEventSeed = {
  eventName: string;
  eventDate: string;
  attraction: string;
  stateCity: string;
  location: string;
  address: string;
  localProducerName: string;
  localProducerContact: string;
  sourceUrl: string;
};

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "mysql://root:password@127.0.0.1:3307/ficha_tecnica?charset=utf8mb4";
}

const internetEvents: InternetEventSeed[] = [
  {
    eventName: "Rock in Rio X (Brasil)",
    eventDate: "2024-09-13",
    attraction: "Travis Scott",
    stateCity: "Rio de Janeiro, RJ",
    location: "Cidade do Rock",
    address: "Parque Olimpico, Barra da Tijuca",
    localProducerName: "Rock World",
    localProducerContact: "(21) 3000-1000",
    sourceUrl: "https://pt.wikipedia.org/wiki/Rock_in_Rio_X",
  },
  {
    eventName: "Lollapalooza Brasil 2025",
    eventDate: "2025-03-28",
    attraction: "Olivia Rodrigo",
    stateCity: "Sao Paulo, SP",
    location: "Autodromo de Interlagos",
    address: "Av. Senador Teotonio Vilela, 261",
    localProducerName: "Lollapalooza Brasil",
    localProducerContact: "(11) 3003-1001",
    sourceUrl: "https://gshow.globo.com/google/amp/festivais/lollapalooza/2025/noticia/lollapalooza-2025-veja-o-line-up-completo-e-a-programacao-de-shows-por-dia.ghtml",
  },
  {
    eventName: "Planeta Atlantida 2025",
    eventDate: "2025-01-31",
    attraction: "Anitta",
    stateCity: "Xangri-la, RS",
    location: "SABA Atlantida",
    address: "Av. Interbalnearios, Atlantida",
    localProducerName: "Planeta Atlantida",
    localProducerContact: "(51) 3003-1002",
    sourceUrl: "https://gshow.globo.com/google/amp/festivais/noticia/planeta-atlantida-2025-saiba-os-horarios-e-os-palcos-dos-shows.ghtml",
  },
  {
    eventName: "The Town 2025",
    eventDate: "2025-09-06",
    attraction: "Katy Perry",
    stateCity: "Sao Paulo, SP",
    location: "Autodromo de Interlagos",
    address: "Av. Senador Teotonio Vilela, 261",
    localProducerName: "Rock World",
    localProducerContact: "(11) 3003-1003",
    sourceUrl: "https://pt.wikipedia.org/wiki/The_Town_2025",
  },
];

async function seedInternetEvents() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available. Check DATABASE_URL and if MySQL is running.");
  }

  const targetNames = internetEvents.map(event => event.eventName);
  const existing = await db
    .select({ id: fichasTecnicas.id, eventName: fichasTecnicas.eventName })
    .from(fichasTecnicas)
    .where(inArray(fichasTecnicas.eventName, targetNames));

  if (existing.length > 0) {
    const existingIds = existing.map(row => row.id);
    await db.delete(scheduleItems).where(inArray(scheduleItems.fichaId, existingIds));
    await db.delete(professionals).where(inArray(professionals.fichaId, existingIds));
    await db.delete(hotels).where(inArray(hotels.fichaId, existingIds));
    await db.delete(logistics).where(inArray(logistics.fichaId, existingIds));
    await db.delete(fichasTecnicas).where(inArray(fichasTecnicas.id, existingIds));
    console.log(`Removed ${existing.length} previously seeded internet events.`);
  }

  for (const event of internetEvents) {
    const [result] = await db.insert(fichasTecnicas).values({
      eventName: event.eventName,
      eventDate: event.eventDate,
      attraction: event.attraction,
      stateCity: event.stateCity,
      location: event.location,
      address: event.address,
      gpsLink: `https://maps.google.com/?q=${encodeURIComponent(event.location + ", " + event.stateCity)}`,
      localProducerName: event.localProducerName,
      localProducerContact: event.localProducerContact,
      status: "published",
    });

    const fichaId = (result as { insertId: number }).insertId;

    await db.insert(scheduleItems).values([
      { fichaId, time: "09:00", activity: "Abertura de backstage", sortOrder: 0 },
      { fichaId, time: "12:00", activity: "Montagem final", sortOrder: 1 },
      { fichaId, time: "16:00", activity: "Passagem de som", sortOrder: 2 },
      { fichaId, time: "19:00", activity: "Abertura dos portoes", sortOrder: 3 },
      { fichaId, time: "22:00", activity: `Show principal: ${event.attraction}`, sortOrder: 4 },
    ]);

    await db.insert(professionals).values([
      { fichaId, name: "Coord. Tecnico", role: "Direcao Tecnica", contact: "(11) 90000-0001", sortOrder: 0 },
      { fichaId, name: "Coord. Luz", role: "Iluminacao", contact: "(11) 90000-0002", sortOrder: 1 },
      { fichaId, name: "Coord. Audio", role: "Audio PA", contact: "(11) 90000-0003", sortOrder: 2 },
    ]);

    await db.insert(hotels).values([
      {
        fichaId,
        name: "Hotel Oficial Producao",
        address: "Endereco central do evento",
        contact: "(11) 4000-1000",
        contactPerson: "Gerencia de Eventos",
        localContact: "(11) 95555-1000",
        gpsLink: `https://maps.google.com/?q=${encodeURIComponent("Hotel oficial " + event.stateCity)}`,
        roomListPdfs: null,
        sortOrder: 0,
      },
    ]);

    await db.insert(logistics).values([
      { fichaId, role: "Produtor Local", name: event.localProducerName, contact: event.localProducerContact, sortOrder: 0 },
      { fichaId, role: "Transporte", name: "Equipe de Transporte", contact: "(11) 94444-2000", sortOrder: 1 },
      { fichaId, role: "Seguranca", name: "Coordenacao de Seguranca", contact: "(11) 93333-3000", sortOrder: 2 },
    ]);

    console.log(`Created: ${event.eventName} (${event.eventDate})`);
    console.log(`Source: ${event.sourceUrl}`);
  }

  const created = await db
    .select({ id: fichasTecnicas.id, eventName: fichasTecnicas.eventName, eventDate: fichasTecnicas.eventDate })
    .from(fichasTecnicas)
    .where(inArray(fichasTecnicas.eventName, targetNames));

  if (created.length !== internetEvents.length) {
    throw new Error(`Expected ${internetEvents.length} seeded events, found ${created.length}.`);
  }

  console.log(`Seed complete: ${created.length} internet-based events inserted and validated.`);
}

seedInternetEvents()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

