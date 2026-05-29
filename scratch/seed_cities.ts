import { redis } from "../server/redis";
import axios from "axios";

async function seedCities() {
  console.log("Fetching Brazilian cities...");
  try {
    // Using a reliable source for Brazilian municipalities
    const response = await axios.get("https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json");
    const municipios = response.data;
    
    const statesResponse = await axios.get("https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/estados.json");
    const estados = statesResponse.data;
    
    const stateMap = new Map();
    estados.forEach((e: any) => stateMap.set(e.codigo_uf, e.sigla));

    const cities = municipios.map((m: any) => `${m.nome}, ${stateMap.get(m.codigo_uf)}`);
    
    console.log(`Found ${cities.length} cities. Seeding to Redis...`);
    
    const pipeline = redis.pipeline();
    cities.forEach((city: string) => {
      pipeline.sadd("suggestions:event:stateCities", city);
    });
    
    await pipeline.exec();
    console.log("Success! All cities seeded.");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding cities:", err);
    process.exit(1);
  }
}

seedCities();
