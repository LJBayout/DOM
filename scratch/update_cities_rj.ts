import { redis } from "../server/redis";

const RJ_TOP_20 = [
  "Rio de Janeiro, RJ",
  "Niterói, RJ",
  "Duque de Caxias, RJ",
  "São Gonçalo, RJ",
  "Nova Iguaçu, RJ",
  "Campos dos Goytacazes, RJ",
  "Belford Roxo, RJ",
  "São João de Meriti, RJ",
  "Petrópolis, RJ",
  "Volta Redonda, RJ",
  "Macaé, RJ",
  "Magé, RJ",
  "Itaboraí, RJ",
  "Cabo Frio, RJ",
  "Nova Friburgo, RJ",
  "Angra dos Reis, RJ",
  "Teresópolis, RJ",
  "Mesquita, RJ",
  "Nilópolis, RJ",
  "Maricá, RJ",
  "Rio das Ostras, RJ",
  "Araruama, RJ",
  "Itaguaí, RJ"
];

async function updateCities() {
  const key = "suggestions:event:stateCities";
  console.log("Cleaning and updating cities to Top 20 RJ...");
  
  try {
    await redis.del(key);
    
    const pipeline = redis.pipeline();
    RJ_TOP_20.forEach(city => pipeline.sadd(key, city));
    await pipeline.exec();
    
    console.log("Success! Redis updated with top RJ cities.");
    process.exit(0);
  } catch (err) {
    console.error("Error updating cities:", err);
    process.exit(1);
  }
}

updateCities();
