import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  fichasTecnicas,
  InsertFichaTecnica,
  InsertHotel,
  InsertProfessional,
  InsertScheduleItem,
  InsertUser,
  hotels,
  professionals,
  scheduleItems,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Fichas Técnicas ──────────────────────────────────────────────────────────

export async function listFichas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fichasTecnicas).orderBy(asc(fichasTecnicas.createdAt));
}

export async function getFichaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(fichasTecnicas).where(eq(fichasTecnicas.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createFicha(data: InsertFichaTecnica) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(fichasTecnicas).values(data);
  return result[0].insertId as number;
}

export async function updateFicha(id: number, data: Partial<InsertFichaTecnica>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fichasTecnicas).set(data).where(eq(fichasTecnicas.id, id));
}

export async function deleteFicha(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scheduleItems).where(eq(scheduleItems.fichaId, id));
  await db.delete(professionals).where(eq(professionals.fichaId, id));
  await db.delete(hotels).where(eq(hotels.fichaId, id));
  await db.delete(fichasTecnicas).where(eq(fichasTecnicas.id, id));
}

// ─── Schedule Items ───────────────────────────────────────────────────────────

export async function getScheduleByFichaId(fichaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduleItems).where(eq(scheduleItems.fichaId, fichaId)).orderBy(asc(scheduleItems.sortOrder));
}

export async function replaceScheduleItems(fichaId: number, items: Omit<InsertScheduleItem, "fichaId">[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scheduleItems).where(eq(scheduleItems.fichaId, fichaId));
  if (items.length > 0) {
    await db.insert(scheduleItems).values(items.map((item, i) => ({ ...item, fichaId, sortOrder: i })));
  }
}

// ─── Professionals ────────────────────────────────────────────────────────────

export async function getProfessionalsByFichaId(fichaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionals).where(eq(professionals.fichaId, fichaId)).orderBy(asc(professionals.sortOrder));
}

export async function replaceProfessionals(fichaId: number, items: Omit<InsertProfessional, "fichaId">[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(professionals).where(eq(professionals.fichaId, fichaId));
  if (items.length > 0) {
    await db.insert(professionals).values(items.map((item, i) => ({ ...item, fichaId, sortOrder: i })));
  }
}

// ─── Hotels ───────────────────────────────────────────────────────────────────

export async function getHotelsByFichaId(fichaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hotels).where(eq(hotels.fichaId, fichaId)).orderBy(asc(hotels.sortOrder));
}

export async function replaceHotels(fichaId: number, items: Omit<InsertHotel, "fichaId">[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hotels).where(eq(hotels.fichaId, fichaId));
  if (items.length > 0) {
    await db.insert(hotels).values(items.map((item, i) => ({ ...item, fichaId, sortOrder: i })));
  }
}
