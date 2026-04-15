import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { presenceLogs } from "../drizzle/schema";

export async function createPresenceLog(data: any) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(presenceLogs).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return result;
}

export async function getPresenceLogsByDoctor(doctorId: number, profileId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(presenceLogs)
    .where(and(eq(presenceLogs.doctorId, doctorId), eq(presenceLogs.profileId, profileId)))
    .orderBy(presenceLogs.checkInTime);
}

export async function updatePresenceLog(id: number, profileId: number, data: any) {
  const db = await getDb();
  if (!db) return null;

  return await db
    .update(presenceLogs)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(presenceLogs.id, id), eq(presenceLogs.profileId, profileId)));
}
