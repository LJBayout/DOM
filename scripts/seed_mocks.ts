import "dotenv/config";
import { getDb } from "../server/db";
import { fichasTecnicas, scheduleItems, professionals, hotels, logistics } from "../drizzle/schema";

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  console.log("Cleaning old mock data...");
  // Use a transaction or just delete all
  await db.delete(scheduleItems);
  await db.delete(professionals);
  await db.delete(hotels);
  await db.delete(logistics);
  await db.delete(fichasTecnicas);

  const mockEvents = [
    {
      eventName: "Rock in Rio 2024",
      eventDate: "2024-09-13",
      attraction: "Travis Scott",
      stateCity: "Rio de Janeiro, RJ",
      location: "Cidade do Rock",
      address: "Av. Salvador Allende, 6500 - Barra da Tijuca",
      localProducerName: "Roberto Medina",
      localProducerContact: "(21) 3333-0000",
      status: "published" as const,
    },
    {
      eventName: "Lollapalooza Brasil 2025",
      eventDate: "2025-03-28",
      attraction: "Olivia Rodrigo",
      stateCity: "São Paulo, SP",
      location: "Autódromo de Interlagos",
      address: "Av. Sen. Teotônio Vilela, 261",
      localProducerName: "T4F Entretenimento",
      localProducerContact: "(11) 4003-5588",
      status: "published" as const,
    },
    {
      eventName: "Festival de Inverno de Garanhuns",
      eventDate: "2024-07-18",
      attraction: "Alceu Valença",
      stateCity: "Garanhuns, PE",
      location: "Praça Mestre Dominguinhos",
      address: "Centro, Garanhuns - PE",
      localProducerName: "Secult PE",
      localProducerContact: "(81) 3184-3000",
      status: "published" as const,
    },
    {
      eventName: "Festa do Peão de Barretos",
      eventDate: "2024-08-15",
      attraction: "Ana Castela",
      stateCity: "Barretos, SP",
      location: "Parque do Peão",
      address: "Rod. Brig. Faria Lima, Km 428",
      localProducerName: "Os Independentes",
      localProducerContact: "(17) 3321-0000",
      status: "published" as const,
    },
    {
      eventName: "Carnaval de Salvador - Camarote Salvador",
      eventDate: "2025-02-27",
      attraction: "Anitta",
      stateCity: "Salvador, BA",
      location: "Circuito Barra-Ondina",
      address: "Av. Oceânica, Ondina",
      localProducerName: "Premium Entretenimento",
      localProducerContact: "(71) 3021-9128",
      status: "published" as const,
    },
    {
      eventName: "Festival de Jazz de Paraty",
      eventDate: "2024-06-07",
      attraction: "Stanley Jordan",
      stateCity: "Paraty, RJ",
      location: "Centro Histórico",
      address: "Praça da Matriz",
      localProducerName: "Brazuca Produções",
      localProducerContact: "(24) 3371-1222",
      status: "published" as const,
    },
    {
      eventName: "Oktoberfest Blumenau",
      eventDate: "2024-10-09",
      attraction: "Bandas Típicas",
      stateCity: "Blumenau, SC",
      location: "Parque Vila Germânica",
      address: "Rua Alberto Stein, 199",
      localProducerName: "Vila Germânica",
      localProducerContact: "(47) 3381-7700",
      status: "published" as const,
    },
    {
      eventName: "Planeta Atlântida 2025",
      eventDate: "2025-01-31",
      attraction: "Luan Santana",
      stateCity: "Xangri-lá, RS",
      location: "Sede Campestre da SABA",
      address: "Av. Interbalneários, 413",
      localProducerName: "DC Set Group",
      localProducerContact: "(51) 3218-8000",
      status: "published" as const,
    },
    {
      eventName: "Festival de Cinema de Gramado",
      eventDate: "2024-08-09",
      attraction: "Cerimônia de Abertura",
      stateCity: "Gramado, RS",
      location: "Palácio dos Festivais",
      address: "Av. Borges de Medeiros, 2697",
      localProducerName: "Gramadotur",
      localProducerContact: "(54) 3286-2002",
      status: "published" as const,
    },
    {
      eventName: "Expocrato 2024",
      eventDate: "2024-07-13",
      attraction: "Gusttavo Lima",
      stateCity: "Crato, CE",
      location: "Parque de Exposição Pedro Felício",
      address: "Rua Rui Barbosa, Crato - CE",
      localProducerName: "Multi Entretenimento",
      localProducerContact: "(88) 3521-1234",
      status: "published" as const,
    }
  ];

  for (const event of mockEvents) {
    const [result] = await db.insert(fichasTecnicas).values(event);
    const fichaId = (result as any).insertId;

    // Add Schedule
    await db.insert(scheduleItems).values([
      { fichaId, time: "10:00", activity: "Montagem de Palco", sortOrder: 0 },
      { fichaId, time: "14:00", activity: "Passagem de Som", sortOrder: 1 },
      { fichaId, time: "20:00", activity: "Abertura dos Portões", sortOrder: 2 },
      { fichaId, time: "22:30", activity: "Início do Show", sortOrder: 3 },
      { fichaId, time: "00:00", activity: "Encerramento", sortOrder: 4 },
    ]);

    // Add Professionals
    await db.insert(professionals).values([
      { fichaId, name: "João Som", role: "Técnico de PA", contact: "(11) 99999-1111", sortOrder: 0 },
      { fichaId, name: "Maria Luz", role: "Light Designer", contact: "(11) 99999-2222", sortOrder: 1 },
      { fichaId, name: "Pedro Roadie", role: "Backline", contact: "(11) 99999-3333", sortOrder: 2 },
    ]);

    // Add Hotels
    await db.insert(hotels).values([
      {
        fichaId,
        name: "Hotel Premium Palace",
        address: "Av. Principal, 100",
        contact: "(11) 4444-5555",
        contactPerson: "Gerente Cláudia",
        localContact: "(11) 98888-7777",
        gpsLink: "https://maps.google.com/?q=Hotel+Premium+Palace",
        sortOrder: 0
      },
      {
        fichaId,
        name: "Eco Resort Spa",
        address: "Estrada das Flores, Km 10",
        contact: "(11) 3333-2222",
        contactPerson: "Recepção VIP",
        localContact: "(11) 97777-6666",
        gpsLink: "https://maps.google.com/?q=Eco+Resort+Spa",
        sortOrder: 1
      }
    ]);

    // Add Logistics
    await db.insert(logistics).values([
      { fichaId, role: "Responsável Banda", name: "Ricardo Manager", contact: "(11) 95555-4444", sortOrder: 0 },
      { fichaId, role: "Responsável Local", name: "Fernanda Venue", contact: "(11) 94444-3333", sortOrder: 1 },
      { fichaId, role: "Segurança", name: "Capitão Silva", contact: "(11) 93333-2222", sortOrder: 2 },
      { fichaId, role: "Produtor Logística", name: "Lucas Transp", contact: "(11) 92222-1111", sortOrder: 3 },
    ]);
  }

  console.log("Mock data seeded successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
