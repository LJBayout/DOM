import Redis from "ioredis";
import { ENV } from "./_core/env";

export const redis = new Redis(ENV.redisUrl);

const KEYS = {
  eventNames: "suggestions:event:names",
  eventAttractions: "suggestions:event:attractions",
  eventLocations: "suggestions:event:locations",
  eventAddresses: "suggestions:event:addresses",
  eventStateCities: "suggestions:event:stateCities",
  producerNames: "suggestions:producer:names",
  producerContacts: "suggestions:producer:contacts",
  profNames: "suggestions:prof:names",
  profRoles: "suggestions:prof:roles",
  profContacts: "suggestions:prof:contacts",
  hotelNames: "suggestions:hotel:names",
  hotelAddresses: "suggestions:hotel:addresses",
  hotelContacts: "suggestions:hotel:contacts",
  hotelContactPersons: "suggestions:hotel:contactPersons",
  hotelLocalContacts: "suggestions:hotel:localContacts",
  logisticsNames: "suggestions:logistics:names",
  logisticsRoles: "suggestions:logistics:roles",
  logisticsContacts: "suggestions:logistics:contacts",
};

export async function saveSuggestions(data: any) {
  const pipeline = redis.pipeline();

  const addIfVal = (key: string, val: string | null | undefined) => {
    if (val && val.trim()) {
      pipeline.sadd(key, val.trim());
    }
  };

  // Event Details
  addIfVal(KEYS.eventNames, data.eventName);
  addIfVal(KEYS.eventAttractions, data.attraction);
  addIfVal(KEYS.eventLocations, data.location);
  addIfVal(KEYS.eventAddresses, data.address);
  addIfVal(KEYS.eventStateCities, data.stateCity);

  // Producers
  addIfVal(KEYS.producerNames, data.localProducerName);
  addIfVal(KEYS.producerContacts, data.localProducerContact);

  if (data.professionals) {
    for (const p of data.professionals) {
      addIfVal(KEYS.profNames, p.name);
      addIfVal(KEYS.profRoles, p.role);
      addIfVal(KEYS.profContacts, p.contact);
    }
  }

  if (data.hotels) {
    for (const h of data.hotels) {
      addIfVal(KEYS.hotelNames, h.name);
      addIfVal(KEYS.hotelAddresses, h.address);
      addIfVal(KEYS.hotelContacts, h.contact);
      addIfVal(KEYS.hotelContactPersons, h.contactPerson);
      addIfVal(KEYS.hotelLocalContacts, h.localContact);
    }
  }

  if (data.logistics) {
    for (const l of data.logistics) {
      addIfVal(KEYS.logisticsNames, l.name);
      addIfVal(KEYS.logisticsRoles, l.role);
      addIfVal(KEYS.logisticsContacts, l.contact);
    }
  }

  await pipeline.exec();
}

export async function getAllSuggestions() {
  const [
    eventNames, eventAttractions, eventLocations, eventAddresses, eventStateCities,
    producerNames, producerContacts,
    profNames, profRoles, profContacts,
    hotelNames, hotelAddresses, hotelContacts, hotelContactPersons, hotelLocalContacts,
    logisticsNames, logisticsRoles, logisticsContacts
  ] = await Promise.all([
    redis.smembers(KEYS.eventNames),
    redis.smembers(KEYS.eventAttractions),
    redis.smembers(KEYS.eventLocations),
    redis.smembers(KEYS.eventAddresses),
    redis.smembers(KEYS.eventStateCities),
    redis.smembers(KEYS.producerNames),
    redis.smembers(KEYS.producerContacts),
    redis.smembers(KEYS.profNames),
    redis.smembers(KEYS.profRoles),
    redis.smembers(KEYS.profContacts),
    redis.smembers(KEYS.hotelNames),
    redis.smembers(KEYS.hotelAddresses),
    redis.smembers(KEYS.hotelContacts),
    redis.smembers(KEYS.hotelContactPersons),
    redis.smembers(KEYS.hotelLocalContacts),
    redis.smembers(KEYS.logisticsNames),
    redis.smembers(KEYS.logisticsRoles),
    redis.smembers(KEYS.logisticsContacts),
  ]);

  return {
    events: { names: eventNames, attractions: eventAttractions, locations: eventLocations, addresses: eventAddresses, stateCities: eventStateCities },
    producers: { names: producerNames, contacts: producerContacts },
    professionals: { names: profNames, roles: profRoles, contacts: profContacts },
    hotels: { names: hotelNames, addresses: hotelAddresses, contacts: hotelContacts, contactPersons: hotelContactPersons, localContacts: hotelLocalContacts },
    logistics: { names: logisticsNames, roles: logisticsRoles, contacts: logisticsContacts },
  };
}
