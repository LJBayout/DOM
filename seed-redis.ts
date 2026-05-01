import { saveSuggestions } from "./server/redis";

async function main() {
  const data = {
    // Basic event info
    eventName: "ANIVERSÁRIO DE SILVA JARDIM ( 185 ANOS )",
    location: "CAMPO DE SILVA JARDIM (AO LADO DO GINÁSIO POLIESPORTIVO JORGE MENDONÇA)",
    address: "Av. Alfredo Camargo Melo - Silva Jardim, RJ, 28820-000",
    stateCity: "Silva Jardim, RJ",
    
    // Producers
    localProducerName: "DIEGO MOREIRA (DOM)",
    localProducerContact: "21 99612-1186",
    
    // Professionals / Logistics / Team
    professionals: [
      { name: "GUSTAVO BAYOUT (DOM)", role: "Produtor responsável", contact: "22 99263-0265" },
      { name: "LUCAS SANTIAGO (DOM)", role: "Produtor auxiliar", contact: "21 97320-4056" },
      { name: "SAMUEL ALVARENGA", role: "SOM (FP ÁUDIO)", contact: "22 99209-6409" },
      { name: "MAICON", role: "Luz (FP ÁUDIO)", contact: "22 99215-1879" },
      { name: "KAMILA NENO (DOM)", role: "Camarim", contact: "22 98126-2762" },
      { name: "Fernando Mesquita", role: "Led (FP ÁUDIO)", contact: "+55 22 99839-1439" },
      { name: "PEU", role: "GERADOR (FP ÁUDIO)", contact: "22 99858-4952" },
      { name: "LUCAS SANTIAGO (DOM)", role: "Carregadores", contact: "21 97320-4056" },
    ],
    
    // Schedule (Just mapping to activities, not sure if we save schedule suggestions but we can)
    // Actually, our saveSuggestions doesn't save eventName, location, etc. Let's update `saveSuggestions` to save these too.
  };

  await saveSuggestions(data);
  console.log("Redis suggestions seeded thoroughly from image.");
  process.exit(0);
}

main().catch(console.error);
