import Redis from "ioredis";
import { ENV } from "./_core/env";

export const redis = new Redis(ENV.redisUrl);

const PRODUCER_NAMES_KEY = "suggestions:producer:names";
const PRODUCER_CONTACTS_KEY = "suggestions:producer:contacts";

export async function saveProducerSuggestion(name: string, contact: string) {
  if (name && name.trim()) {
    await redis.sadd(PRODUCER_NAMES_KEY, name.trim());
  }
  if (contact && contact.trim()) {
    await redis.sadd(PRODUCER_CONTACTS_KEY, contact.trim());
  }
}

export async function getProducerSuggestions() {
  const [names, contacts] = await Promise.all([
    redis.smembers(PRODUCER_NAMES_KEY),
    redis.smembers(PRODUCER_CONTACTS_KEY),
  ]);
  return { names, contacts };
}
