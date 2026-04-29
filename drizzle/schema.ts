import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Fichas Técnicas ──────────────────────────────────────────────────────────

export const fichasTecnicas = mysqlTable("fichas_tecnicas", {
  id: int("id").autoincrement().primaryKey(),
  eventName: varchar("eventName", { length: 255 }).notNull(),
  eventDate: varchar("eventDate", { length: 32 }).notNull().default(""),
  attraction: varchar("attraction", { length: 255 }).notNull().default(""),
  attractionPdfs: text("attractionPdfs"),
  stateCity: varchar("stateCity", { length: 255 }).notNull().default(""),
  location: varchar("location", { length: 255 }).notNull().default(""),
  address: text("address").notNull().default(""),
  localProducerName: varchar("localProducerName", { length: 255 }).notNull().default(""),
  localProducerContact: varchar("localProducerContact", { length: 255 }).notNull().default(""),
  hotelName: varchar("hotelName", { length: 255 }).notNull().default(""),
  hotelAddress: text("hotelAddress").notNull().default(""),
  hotelContact: varchar("hotelContact", { length: 255 }).notNull().default(""),
  hotelContactPerson: varchar("hotelContactPerson", { length: 255 }).notNull().default(""),
  hotelLocalContact: varchar("hotelLocalContact", { length: 255 }).notNull().default(""),
  hotelGpsLink: text("hotelGpsLink").notNull().default(""),
  hotelRoomListPdfs: text("hotelRoomListPdfs"),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FichaTecnica = typeof fichasTecnicas.$inferSelect;
export type InsertFichaTecnica = typeof fichasTecnicas.$inferInsert;

// ─── Schedule Items ───────────────────────────────────────────────────────────

export const scheduleItems = mysqlTable("schedule_items", {
  id: int("id").autoincrement().primaryKey(),
  fichaId: int("fichaId").notNull(),
  time: varchar("time", { length: 16 }).notNull().default(""),
  activity: varchar("activity", { length: 255 }).notNull().default(""),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type InsertScheduleItem = typeof scheduleItems.$inferInsert;

// ─── Professionals ────────────────────────────────────────────────────────────

export const professionals = mysqlTable("professionals", {
  id: int("id").autoincrement().primaryKey(),
  fichaId: int("fichaId").notNull(),
  name: varchar("name", { length: 255 }).notNull().default(""),
  role: varchar("role", { length: 128 }).notNull().default(""),
  contact: varchar("contact", { length: 255 }).notNull().default(""),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = typeof professionals.$inferInsert;

// ─── Hotels ───────────────────────────────────────────────────────────────────

export const hotels = mysqlTable("hotels", {
  id: int("id").autoincrement().primaryKey(),
  fichaId: int("fichaId").notNull(),
  name: varchar("name", { length: 255 }).notNull().default(""),
  address: text("address").notNull().default(""),
  contact: varchar("contact", { length: 255 }).notNull().default(""),
  contactPerson: varchar("contactPerson", { length: 255 }).notNull().default(""),
  localContact: varchar("localContact", { length: 255 }).notNull().default(""),
  gpsLink: text("gpsLink").notNull().default(""),
  roomListPdfs: text("roomListPdfs"), // Store as JSON string or comma-separated
  sortOrder: int("sortOrder").notNull().default(0),
});

export type Hotel = typeof hotels.$inferSelect;
export type InsertHotel = typeof hotels.$inferInsert;

// ─── Logistics ──────────────────────────────────────────────────────────────

export const logistics = mysqlTable("logistics", {
  id: int("id").autoincrement().primaryKey(),
  fichaId: int("fichaId").notNull(),
  role: varchar("role", { length: 128 }).notNull().default(""),
  name: varchar("name", { length: 255 }).notNull().default(""),
  contact: varchar("contact", { length: 255 }).notNull().default(""),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type LogisticsItem = typeof logistics.$inferSelect;
export type InsertLogisticsItem = typeof logistics.$inferInsert;

