import { and, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import {
  InsertScheduleProfile,
  InsertUser,
  auditLogs,
  dateUnavailabilities,
  doctors,
  fixedUnavailabilities,
  holidays,
  localUserCredentials,
  monthlyExceptions,
  nightRotationState,
  notificationDispatches,
  scheduleEntries,
  scheduleProfiles,
  schedules,
  swapRequests,
  users,
  userProfiles,
  weekendRules,
  weeklyRules,
  authTokens,
} from "../drizzle/schema";
import {
  getOfflineDoctorById,
  getOfflineEntriesForSchedule,
  getOfflineExceptionById,
  getOfflineExceptions,
  getOfflineExceptionsForMonth,
  getOfflineHolidays,
  getOfflineHolidaysForMonth,
  getOfflineScheduleById,
  getOfflineScheduleByMonth,
  getOfflineScheduleProfileById,
  getOfflineStatsForSchedule,
  getOfflineValidationForSchedule,
  getOfflineWeeklyRuleById,
  getOfflineWeeklyRules,
  getOfflineWeekendRuleById,
  getOfflineWeekendRules,
  getOfflineDoctors,
  isOfflineProfile,
  listOfflineScheduleProfiles,
} from "./offlineProfiles";
import { ENV } from "./_core/env";

type Database = ReturnType<typeof drizzle>;
type OfflineRuntimeScheduleProfile = typeof scheduleProfiles.$inferSelect;
type OfflineRuntimeSchedule = typeof schedules.$inferSelect;
type OfflineRuntimeEntry = typeof scheduleEntries.$inferSelect;
type OfflineRuntimeDoctor = typeof doctors.$inferSelect;
type OfflineRuntimeFixedUnavailability = typeof fixedUnavailabilities.$inferSelect;
type OfflineRuntimeWeeklyRule = typeof weeklyRules.$inferSelect;
type OfflineRuntimeWeekendRule = typeof weekendRules.$inferSelect;
type OfflineRuntimeException = Omit<
  typeof monthlyExceptions.$inferSelect,
  "specificDate"
> & {
  specificDate: string | Date | null;
};
type OfflineRuntimeDateUnavailability = typeof dateUnavailabilities.$inferSelect;
type OfflineRuntimeHoliday = typeof holidays.$inferSelect;
type OfflineRuntimeSwapRequest = typeof swapRequests.$inferSelect;
type OfflineRuntimeNotificationDispatch = typeof notificationDispatches.$inferSelect;
type OfflineRuntimeLocalUserCredential =
  typeof localUserCredentials.$inferSelect;

const DEFAULT_PROFILE_NAME = "Equipe Padrão";
const DEFAULT_PROFILE_DESCRIPTION = "Perfil base do sistema";
const LEGACY_PROFILE_ID = 1;
const LOCAL_DEV_OPEN_ID = "__local_dev_admin__";

let _db: Database | null = null;
let _hasProfileSchema: boolean | null = null;
let _hasLocalUserCredentialsSchema: boolean | null = null;
let _dbInitAttempted = false;
const offlineRuntimeScheduleProfilesById = new Map<
  number,
  OfflineRuntimeScheduleProfile
>();
const offlineRuntimeSchedulesByMonth = new Map<string, OfflineRuntimeSchedule>();
const offlineRuntimeSchedulesById = new Map<number, OfflineRuntimeSchedule>();
const offlineRuntimeEntriesByScheduleId = new Map<number, OfflineRuntimeEntry[]>();
const offlineRuntimeDoctorsById = new Map<number, OfflineRuntimeDoctor>();
const offlineRuntimeFixedUnavailabilitiesById = new Map<
  number,
  OfflineRuntimeFixedUnavailability
>();
const offlineRuntimeWeeklyRulesById = new Map<number, OfflineRuntimeWeeklyRule>();
const offlineRuntimeWeekendRulesById = new Map<number, OfflineRuntimeWeekendRule>();
const offlineRuntimeExceptionsById = new Map<number, OfflineRuntimeException>();
const offlineRuntimeDateUnavailabilitiesById = new Map<
  number,
  OfflineRuntimeDateUnavailability
>();
const offlineRuntimeHolidaysById = new Map<number, OfflineRuntimeHoliday>();
const offlineRuntimeSwapRequestsById = new Map<number, OfflineRuntimeSwapRequest>();
const offlineRuntimeNotificationDispatchesById = new Map<
  number,
  OfflineRuntimeNotificationDispatch
>();
const offlineRuntimeManagedUsersById = new Map<number, typeof users.$inferSelect>();
const offlineRuntimeLocalUserCredentialsById = new Map<
  number,
  OfflineRuntimeLocalUserCredential
>();
const offlineDeletedHolidayIds = new Set<number>();

export function getMonthDateRange(year: number, month: number) {
  const normalizedMonth = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: `${year}-${normalizedMonth}-01`,
    endDate: `${year}-${normalizedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

function normalizeDateOnlyValue(value: string | Date | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function normalizeExceptionRecord<T extends { specificDate: string | Date | null }>(
  exception: T
) {
  return {
    ...exception,
    specificDate: normalizeDateOnlyValue(exception.specificDate),
  };
}

export type ManagedLocalUser = {
  userId: number;
  openId: string;
  email: string;
  name: string | null;
  role: typeof users.$inferSelect["role"];
  loginMethod: string | null;
  active: boolean;
  isEmailVerified: boolean;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
  maxProfiles: number;
  isPaid: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
};

type ManagedLocalUserWithPassword = ManagedLocalUser & {
  passwordHash: string;
};

function getOfflineRuntimeScheduleMonthKey(
  profileId: number,
  year: number,
  month: number
) {
  return `${profileId}-${year}-${String(month).padStart(2, "0")}`;
}

function buildOfflineRuntimeScheduleId(
  profileId: number,
  year: number,
  month: number
) {
  if (profileId === LEGACY_PROFILE_ID) {
    return year * 100 + month;
  }

  return profileId * 1_000_000 + Number(`${String(year).slice(-2)}${String(month).padStart(2, "0")}`);
}

function storeOfflineRuntimeSchedule(schedule: OfflineRuntimeSchedule) {
  offlineRuntimeSchedulesByMonth.set(
    getOfflineRuntimeScheduleMonthKey(schedule.profileId, schedule.year, schedule.month),
    schedule
  );
  offlineRuntimeSchedulesById.set(schedule.id, schedule);
  return schedule;
}

function getOfflineRuntimeScheduleByMonth(
  profileId: number,
  year: number,
  month: number
) {
  return offlineRuntimeSchedulesByMonth.get(
    getOfflineRuntimeScheduleMonthKey(profileId, year, month)
  );
}

function getOfflineRuntimeScheduleById(id: number) {
  return offlineRuntimeSchedulesById.get(id);
}

function getNextOfflineRuntimeId<T extends { id: number }>(
  runtimeMap: Map<number, T>,
  fallbackIds: number[] = []
) {
  return Math.max(0, ...fallbackIds, ...Array.from(runtimeMap.keys())) + 1;
}

function mergeOfflineRuntimeRecords<T extends { id: number }>(
  baseRecords: T[],
  runtimeMap: Map<number, T>
) {
  const merged = new Map<number, T>();

  for (const record of baseRecords) {
    merged.set(record.id, record);
  }

  for (const record of Array.from(runtimeMap.values())) {
    merged.set(record.id, record);
  }

  return Array.from(merged.values());
}

function getDefaultScheduleProfile() {
  const now = new Date();
  return {
    id: LEGACY_PROFILE_ID,
    name: DEFAULT_PROFILE_NAME,
    description: DEFAULT_PROFILE_DESCRIPTION,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function isMissingProfileSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("schedule_profiles") ||
    message.includes("profileId") ||
    message.includes("ER_NO_SUCH_TABLE") ||
    message.includes("Unknown column")
  );
}

function isMissingLocalUserCredentialsSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("local_user_credentials") ||
    message.includes("ER_NO_SUCH_TABLE")
  );
}

async function hasProfileSchema(db: Database) {
  if (_hasProfileSchema !== null) {
    return _hasProfileSchema;
  }

  try {
    await db.execute(sql`select id from schedule_profiles limit 1`);
    await db.execute(sql`select profileId from doctors limit 1`);
    _hasProfileSchema = true;
  } catch (error) {
    if (!isMissingProfileSchemaError(error)) {
      throw error;
    }

    console.warn(
      "[Database] Profile schema not available yet, using legacy single-profile mode."
    );
    _hasProfileSchema = false;
  }

  return _hasProfileSchema;
}

async function hasLocalUserCredentialsSchema(db: Database) {
  if (_hasLocalUserCredentialsSchema !== null) {
    return _hasLocalUserCredentialsSchema;
  }

  try {
    await db.execute(sql`select id from local_user_credentials limit 1`);
    _hasLocalUserCredentialsSchema = true;
  } catch (error) {
    if (!isMissingLocalUserCredentialsSchemaError(error)) {
      throw error;
    }

    console.warn(
      "[Database] Local user credentials schema not available yet, using runtime fallback."
    );
    _hasLocalUserCredentialsSchema = false;
  }

  return _hasLocalUserCredentialsSchema;
}

function withoutProfileId<T extends { profileId?: unknown }>(data: T): any {
  const { profileId, ...rest } = data as Record<string, unknown>;
  return rest;
}

export async function getDb() {
  if (_db) {
    return _db;
  }

  if (_dbInitAttempted || !process.env.DATABASE_URL) {
    return null;
  }

  _dbInitAttempted = true;

  try {
    const candidate = drizzle(process.env.DATABASE_URL);
    await candidate.execute(sql`select 1`);
    _db = candidate;
  } catch (error) {
    console.warn(
      "[Database] Failed to connect. Running in offline fallback mode:",
      error
    );
    _db = null;
  }

  return _db;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    await db.execute(sql`select 1`);
    return true;
  } catch (error) {
    console.warn("[Database] Ping failed:", error);
    return false;
  }
}

async function selectActiveScheduleProfiles(db: Database) {
  if (!(await hasProfileSchema(db))) {
    return [getDefaultScheduleProfile()];
  }

  const profiles = await db
    .select()
    .from(scheduleProfiles)
    .where(eq(scheduleProfiles.active, true));

  return [...profiles].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  );
}

async function ensureDefaultScheduleProfile(db: Database) {
  const existingProfiles = await selectActiveScheduleProfiles(db);
  if (existingProfiles.length > 0) {
    return existingProfiles[0] ?? null;
  }

  const result = await db.insert(scheduleProfiles).values({
    name: DEFAULT_PROFILE_NAME,
    description: DEFAULT_PROFILE_DESCRIPTION,
  });
  const insertId = Number((result as { insertId?: number }).insertId ?? 0);

  if (insertId > 0) {
    const created = await db
      .select()
      .from(scheduleProfiles)
      .where(eq(scheduleProfiles.id, insertId))
      .limit(1);
    return created[0] ?? null;
  }

  const fallbackProfiles = await selectActiveScheduleProfiles(db);
  return fallbackProfiles[0] ?? null;
}

function getOfflineRuntimeScheduleProfiles() {
  return mergeOfflineRuntimeRecords(
    listOfflineScheduleProfiles(),
    offlineRuntimeScheduleProfilesById
  )
    .filter((profile) => profile.active)
    .sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
}

function getBuiltInAdminUser(): ManagedLocalUser {
  const now = new Date();
  return {
    userId: 0,
    openId: LOCAL_DEV_OPEN_ID,
    email: ENV.localLoginUsername.trim().toLowerCase(),
    name: "Administrador",
    role: "admin",
    loginMethod: "password",
    active: true,
    isEmailVerified: true,
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    maxProfiles: 999,
    isPaid: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: "active",
  };
}

function toManagedLocalUser(
  user: typeof users.$inferSelect,
  credential: OfflineRuntimeLocalUserCredential,
  isBuiltIn = false
): ManagedLocalUser {
  return {
    userId: user.id,
    openId: user.openId,
    email: credential.username,
    name: user.name ?? null,
    role: user.role,
    loginMethod: user.loginMethod ?? null,
    active: credential.active,
    isEmailVerified: user.isEmailVerified,
    isBuiltIn,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignedIn: user.lastSignedIn,
    maxProfiles: user.maxProfiles,
    isPaid: user.isPaid,
    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    subscriptionStatus: user.subscriptionStatus ?? null,
  };
}

function sortManagedLocalUsers(left: ManagedLocalUser, right: ManagedLocalUser) {
  if (left.isBuiltIn !== right.isBuiltIn) {
    return left.isBuiltIn ? -1 : 1;
  }

  return left.email.localeCompare(right.email, "pt-BR", {
    sensitivity: "base",
  });
}

function listOfflineManagedLocalUsers() {
  const localUsers = Array.from(offlineRuntimeManagedUsersById.values());
  const credentialsByUserId = new Map(
    Array.from(offlineRuntimeLocalUserCredentialsById.values()).map(
      (credential) => [credential.userId, credential]
    )
  );

  const managedUsers = localUsers
    .map((user) => {
      const credential = credentialsByUserId.get(user.id);
      if (!credential) return null;
      return toManagedLocalUser(user, credential);
    })
    .filter((user): user is ManagedLocalUser => Boolean(user));

  const builtInAdmin = getBuiltInAdminUser();
  if (!managedUsers.some((user) => user.email === builtInAdmin.email)) {
    managedUsers.unshift(builtInAdmin);
  }

  return managedUsers.sort(sortManagedLocalUsers);
}

function findOfflineManagedLocalUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = Array.from(offlineRuntimeLocalUserCredentialsById.values()).find(
    (item) => item.username === normalizedEmail
  );

  if (!credential) return null;

  const user = offlineRuntimeManagedUsersById.get(credential.userId);
  if (!user) return null;

  return {
    ...toManagedLocalUser(user, credential),
    passwordHash: credential.passwordHash,
  } satisfies ManagedLocalUserWithPassword;
}

function findOfflineManagedLocalUserByOpenId(openId: string) {
  const user = Array.from(offlineRuntimeManagedUsersById.values()).find(
    (item) => item.openId === openId
  );
  if (!user) return null;

  const credential = Array.from(offlineRuntimeLocalUserCredentialsById.values()).find(
    (item) => item.userId === user.id
  );
  if (!credential) return null;

  return toManagedLocalUser(user, credential);
}

// Users
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "staff";
    updateSet.role = "staff";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function createAuthToken(input: {
  userId: number;
  type: typeof authTokens.$inferSelect["type"];
  expiresInMinutes?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + (input.expiresInMinutes ?? 60));

  await db.insert(authTokens).values({
    userId: input.userId,
    token,
    type: input.type,
    expiresAt,
  });

  return token;
}

export async function verifyAuthToken(token: string, type: typeof authTokens.$inferSelect["type"]) {
  const db = await getDb();
  if (!db) return null;

  const [record] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.token, token),
        eq(authTokens.type, type),
        gte(authTokens.expiresAt, new Date()),
        sql`${authTokens.usedAt} IS NULL`
      )
    )
    .limit(1);

  if (!record) return null;

  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, record.id));

  return record;
}

export async function setEmailVerified(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ isEmailVerified: true })
    .where(eq(users.id, userId));
}

export async function updateLocalUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(localUserCredentials)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(localUserCredentials.userId, userId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listManagedLocalUsers(): Promise<ManagedLocalUser[]> {
  const db = await getDb();
  if (!db || !(await hasLocalUserCredentialsSchema(db))) {
    return listOfflineManagedLocalUsers();
  }

  const rows = await db
    .select({
      user: users,
      credential: localUserCredentials,
    })
    .from(localUserCredentials)
    .innerJoin(users, eq(localUserCredentials.userId, users.id));

  const managedUsers = rows.map(({ user, credential }) =>
    toManagedLocalUser(user, credential)
  );

  const builtInAdmin = getBuiltInAdminUser();
  if (!managedUsers.some((user) => user.email === builtInAdmin.email)) {
    managedUsers.push(builtInAdmin);
  }

  return managedUsers.sort(sortManagedLocalUsers);
}

export async function getManagedLocalUserByEmail(
  email: string
): Promise<ManagedLocalUserWithPassword | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await getDb();

  if (!db || !(await hasLocalUserCredentialsSchema(db))) {
    return findOfflineManagedLocalUserByEmail(normalizedEmail);
  }

  const rows = await db
    .select({
      user: users,
      credential: localUserCredentials,
    })
    .from(localUserCredentials)
    .innerJoin(users, eq(localUserCredentials.userId, users.id))
    .where(eq(localUserCredentials.username, normalizedEmail))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    ...toManagedLocalUser(row.user, row.credential),
    passwordHash: row.credential.passwordHash,
  };
}

export async function getManagedLocalUserByOpenId(
  openId: string
): Promise<ManagedLocalUser | null> {
  const db = await getDb();

  if (!db || !(await hasLocalUserCredentialsSchema(db))) {
    return findOfflineManagedLocalUserByOpenId(openId);
  }

  const rows = await db
    .select({
      user: users,
      credential: localUserCredentials,
    })
    .from(localUserCredentials)
    .innerJoin(users, eq(localUserCredentials.userId, users.id))
    .where(eq(users.openId, openId))
    .limit(1);

  const row = rows[0];
  return row ? toManagedLocalUser(row.user, row.credential) : null;
}

export async function createManagedLocalUser(input: {
  email: string;
  name: string;
  openId: string;
  passwordHash: string;
  role: typeof users.$inferSelect["role"];
  isEmailVerified?: boolean;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const builtInAdmin = getBuiltInAdminUser();

  if (normalizedEmail === builtInAdmin.email) {
    throw new Error("Este e-mail e reservado pelo administrador padrao do sistema");
  }

  const existing = await getManagedLocalUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("Ja existe um usuario com este e-mail");
  }

  const db = await getDb();
  if (!db || !(await hasLocalUserCredentialsSchema(db))) {
    const now = new Date();
    const nextUserId = getNextOfflineRuntimeId(offlineRuntimeManagedUsersById);
    const createdUser: typeof users.$inferSelect = {
      id: nextUserId,
      openId: input.openId,
      name: input.name,
      email: normalizedEmail,
      loginMethod: "password",
      role: input.role,
      isEmailVerified: input.isEmailVerified ?? false,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
      maxProfiles: 1,
      isPaid: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
    };
    const createdCredential: OfflineRuntimeLocalUserCredential = {
      id: getNextOfflineRuntimeId(offlineRuntimeLocalUserCredentialsById),
      userId: nextUserId,
      username: normalizedEmail,
      passwordHash: input.passwordHash,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeManagedUsersById.set(createdUser.id, createdUser);
    offlineRuntimeLocalUserCredentialsById.set(
      createdCredential.id,
      createdCredential
    );

    return toManagedLocalUser(createdUser, createdCredential);
  }

  return db.transaction(async (tx) => {
    const userInsert = await tx.insert(users).values({
      openId: input.openId,
      name: input.name,
      email: normalizedEmail,
      loginMethod: "password",
      role: input.role,
      isEmailVerified: input.isEmailVerified ?? false,
      lastSignedIn: new Date(),
      maxProfiles: 1,
      isPaid: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
    });

    let userId = Number((userInsert as { insertId?: number }).insertId ?? 0);
    if (!userId) {
      const insertedRows = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.openId, input.openId))
        .limit(1);

      userId = insertedRows[0]?.id ?? 0;
    }

    if (!userId) {
      throw new Error("Falha ao criar usuario");
    }

    await tx.insert(localUserCredentials).values({
      userId,
      username: normalizedEmail,
      passwordHash: input.passwordHash,
      active: true,
    });

    const createdRows = await tx
      .select({
        user: users,
        credential: localUserCredentials,
      })
      .from(localUserCredentials)
      .innerJoin(users, eq(localUserCredentials.userId, users.id))
      .where(eq(localUserCredentials.userId, userId))
      .limit(1);

    const created = createdRows[0];
    if (!created) {
      throw new Error("Falha ao carregar usuario criado");
    }

    return toManagedLocalUser(created.user, created.credential);
  });
}

export async function setManagedLocalUserActive(userId: number, active: boolean) {
  const db = await getDb();

  if (!db || !(await hasLocalUserCredentialsSchema(db))) {
    const credentialEntry = Array.from(offlineRuntimeLocalUserCredentialsById.entries()).find(
      ([, credential]) => credential.userId === userId
    );

    if (!credentialEntry) {
      throw new Error("Usuario nao encontrado");
    }

    const [credentialId, credential] = credentialEntry;
    offlineRuntimeLocalUserCredentialsById.set(credentialId, {
      ...credential,
      active,
      updatedAt: new Date(),
    });
    return;
  }

  await db
    .update(localUserCredentials)
    .set({ active })
    .where(eq(localUserCredentials.userId, userId));
}

export async function deleteManagedLocalUser(userId: number) {
  const builtInAdmin = getBuiltInAdminUser();

  if (userId === builtInAdmin.userId) {
    throw new Error("O administrador padrao do sistema nao pode ser excluido");
  }

  const db = await getDb();

  if (!db || !(await hasLocalUserCredentialsSchema(db))) {
    const credentialEntry = Array.from(
      offlineRuntimeLocalUserCredentialsById.entries()
    ).find(([, credential]) => credential.userId === userId);

    if (!credentialEntry) {
      throw new Error("Usuario nao encontrado");
    }

    const [credentialId] = credentialEntry;
    offlineRuntimeLocalUserCredentialsById.delete(credentialId);
    offlineRuntimeManagedUsersById.delete(userId);
    return;
  }

  const existingRows = await db
    .select({
      user: users,
      credential: localUserCredentials,
    })
    .from(localUserCredentials)
    .innerJoin(users, eq(localUserCredentials.userId, users.id))
    .where(eq(localUserCredentials.userId, userId))
    .limit(1);

  if (!existingRows[0]) {
    throw new Error("Usuario nao encontrado");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(localUserCredentials)
      .where(eq(localUserCredentials.userId, userId));

    await tx.delete(users).where(eq(users.id, userId));
  });
}

// Schedule profiles
export async function listScheduleProfiles(
  userId?: number,
  role?: typeof users.$inferSelect["role"]
) {
  const db = await getDb();
  if (!db) return getOfflineRuntimeScheduleProfiles();

  await ensureDefaultScheduleProfile(db);
  const profiles = await selectActiveScheduleProfiles(db);

  if (userId === undefined || userId === null) {
    return profiles;
  }

  // Se tem usuário, filtras os profiles que ele tem vinculo
  // Como o sistema aceita admins globais, vamos assumir que o router faz essa distinção.
  // Por precaução, bater na tabela user_profiles
  const userLinks = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const linkedProfileIds = new Set(userLinks.map((link) => link.profileId));

  if (role === "admin" && linkedProfileIds.size === 0) {
    if (profiles.length <= 1) {
      return profiles;
    }

    return [...profiles].sort((left, right) => {
      if (left.id === LEGACY_PROFILE_ID) return 1;
      if (right.id === LEGACY_PROFILE_ID) return -1;
      return 0;
    });
  }

  return profiles.filter((p) => linkedProfileIds.has(p.id));
}

export async function hasProfileAccess(userId: number, profileId: number): Promise<{ hasAccess: boolean; role?: "owner" | "admin" | "viewer" }> {
  const db = await getDb();
  if (!db) return { hasAccess: true, role: "owner" }; // fallback pro offline onde o admin (id 0) vê tudo
  
  const link = await db
    .select()
    .from(userProfiles)
    .where(and(eq(userProfiles.userId, userId), eq(userProfiles.profileId, profileId)))
    .limit(1);

  if (link.length === 0) return { hasAccess: false };

  return { 
    hasAccess: true, 
    role: link[0].role as "owner" | "admin" | "viewer" 
  };
}

export async function getScheduleProfileById(id: number) {
  const db = await getDb();
  if (!db) {
    return (
      offlineRuntimeScheduleProfilesById.get(id) ?? getOfflineScheduleProfileById(id)
    );
  }
  if (!(await hasProfileSchema(db))) {
    return id === LEGACY_PROFILE_ID ? getDefaultScheduleProfile() : undefined;
  }
  const result = await db
    .select()
    .from(scheduleProfiles)
    .where(and(eq(scheduleProfiles.id, id), eq(scheduleProfiles.active, true)))
    .limit(1);
  return result[0];
}

export async function createScheduleProfile(data: InsertScheduleProfile, ownerUserId?: number) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const createdProfile: OfflineRuntimeScheduleProfile = {
      id: getNextOfflineRuntimeId(
        offlineRuntimeScheduleProfilesById,
        listOfflineScheduleProfiles().map((profile) => profile.id)
      ),
      name: data.name,
      description: data.description ?? null,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeScheduleProfilesById.set(createdProfile.id, createdProfile);
    return createdProfile;
  }
  if (!(await hasProfileSchema(db))) {
    return getDefaultScheduleProfile();
  }

  const result = await db.insert(scheduleProfiles).values(data);
  const insertId = Number((result as { insertId?: number }).insertId ?? 0);
  const hasOwnerUserId = ownerUserId !== undefined && ownerUserId !== null;

  if (insertId > 0) {
    if (hasOwnerUserId) {
      await db.insert(userProfiles).values({
        userId: ownerUserId,
        profileId: insertId,
        role: "owner",
      });
    }
    return getScheduleProfileById(insertId);
  }

  const profiles = await selectActiveScheduleProfiles(db);
  const matched = profiles.find((profile) => profile.name === data.name) ?? profiles.at(-1) ?? null;
  if (matched && hasOwnerUserId) {
     const exists = await db.select().from(userProfiles).where(and(eq(userProfiles.userId, ownerUserId), eq(userProfiles.profileId, matched.id))).limit(1);
     if (exists.length === 0) {
        await db.insert(userProfiles).values({
          userId: ownerUserId,
          profileId: matched.id,
          role: "owner",
        });
     }
  }
  return matched;
}

// Doctors
export async function getAllDoctors(profileId: number) {
  const db = await getDb();
  if (!db) {
    return mergeOfflineRuntimeRecords(
      getOfflineDoctors(profileId),
      offlineRuntimeDoctorsById
    ).filter(
      (doctor) => doctor.profileId === profileId && doctor.ativo
    );
  }
  if (!(await hasProfileSchema(db))) {
    return db.select().from(doctors).where(eq(doctors.ativo, true));
  }
  return db
    .select()
    .from(doctors)
    .where(and(eq(doctors.profileId, profileId), eq(doctors.ativo, true)));
}

export async function getDoctorById(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const runtimeDoctor = offlineRuntimeDoctorsById.get(id);
    if (runtimeDoctor?.profileId === profileId) {
      return runtimeDoctor;
    }
    return getOfflineDoctorById(profileId, id);
  }
  if (!(await hasProfileSchema(db))) {
    const result = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    return result[0];
  }
  const result = await db
    .select()
    .from(doctors)
    .where(and(eq(doctors.id, id), eq(doctors.profileId, profileId)))
    .limit(1);
  return result[0];
}

export async function createDoctor(data: typeof doctors.$inferInsert) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const createdDoctor: OfflineRuntimeDoctor = {
      id: getNextOfflineRuntimeId(
        offlineRuntimeDoctorsById,
        getOfflineDoctors(data.profileId).map((doctor) => doctor.id)
      ),
      profileId: data.profileId,
      name: data.name,
      shortName: data.shortName,
      email: data.email ?? null,
      crmNumber: data.crmNumber ?? null,
      crmState: data.crmState ?? null,
      phone: data.phone ?? null,
      category: data.category ?? "titular",
      hasSus: data.hasSus ?? false,
      hasConvenio: data.hasConvenio ?? false,
      canManhaSus: data.canManhaSus ?? false,
      canManhaConvenio: data.canManhaConvenio ?? false,
      canTardeSus: data.canTardeSus ?? false,
      canTardeConvenio: data.canTardeConvenio ?? false,
      canNoite: data.canNoite ?? false,
      canFinalDeSemana: data.canFinalDeSemana ?? false,
      canSabado: data.canSabado ?? false,
      canDomingo: data.canDomingo ?? false,
      can24h: data.can24h ?? false,
      participaRodizioNoite: data.participaRodizioNoite ?? false,
      specialty: data.specialty ?? null,
      limiteplantoesmes: data.limiteplantoesmes ?? 0,
      limiteNoitesMes: data.limiteNoitesMes ?? 0,
      limiteFdsMes: data.limiteFdsMes ?? 0,
      prioridade: data.prioridade ?? "media",
      cor: data.cor ?? "#3B82F6",
      observacoes: data.observacoes ?? null,
      ativo: data.ativo ?? true,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeDoctorsById.set(createdDoctor.id, createdDoctor);
    return createdDoctor;
  }
  if (!(await hasProfileSchema(db))) {
    return db.insert(doctors).values(withoutProfileId(data));
  }
  return db.insert(doctors).values(data);
}

export async function updateDoctor(
  id: number,
  profileId: number,
  data: Partial<typeof doctors.$inferInsert>
) {
  const db = await getDb();
  if (!db) {
    const currentDoctor =
      offlineRuntimeDoctorsById.get(id) ?? getOfflineDoctorById(profileId, id);

    if (!currentDoctor) return;

    offlineRuntimeDoctorsById.set(id, {
      ...currentDoctor,
      ...data,
      profileId,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db.update(doctors).set(withoutProfileId(data)).where(eq(doctors.id, id));
    return;
  }
  await db
    .update(doctors)
    .set(data)
    .where(and(eq(doctors.id, id), eq(doctors.profileId, profileId)));
}

export async function deleteDoctor(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const currentDoctor =
      offlineRuntimeDoctorsById.get(id) ?? getOfflineDoctorById(profileId, id);

    if (!currentDoctor) return;

    offlineRuntimeDoctorsById.set(id, {
      ...currentDoctor,
      ativo: false,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db.update(doctors).set({ ativo: false }).where(eq(doctors.id, id));
    return;
  }
  await db
    .update(doctors)
    .set({ ativo: false })
    .where(and(eq(doctors.id, id), eq(doctors.profileId, profileId)));
}

// Weekly rules
export async function getAllWeeklyRules(profileId: number) {
  const db = await getDb();
  if (!db) {
    return mergeOfflineRuntimeRecords(
      getOfflineWeeklyRules(profileId),
      offlineRuntimeWeeklyRulesById
    ).filter((rule) => rule.profileId === profileId && rule.ativo);
  }
  if (!(await hasProfileSchema(db))) {
    return db.select().from(weeklyRules).where(eq(weeklyRules.ativo, true));
  }
  return db
    .select()
    .from(weeklyRules)
    .where(
      and(eq(weeklyRules.profileId, profileId), eq(weeklyRules.ativo, true))
    );
}

export async function getWeeklyRuleById(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    return (
      offlineRuntimeWeeklyRulesById.get(id) ??
      getOfflineWeeklyRuleById(profileId, id)
    );
  }
  if (!(await hasProfileSchema(db))) {
    const result = await db.select().from(weeklyRules).where(eq(weeklyRules.id, id)).limit(1);
    return result[0];
  }
  const result = await db
    .select()
    .from(weeklyRules)
    .where(and(eq(weeklyRules.id, id), eq(weeklyRules.profileId, profileId)))
    .limit(1);
  return result[0];
}

export async function createWeeklyRule(data: typeof weeklyRules.$inferInsert) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const createdRule: OfflineRuntimeWeeklyRule = {
      id: getNextOfflineRuntimeId(offlineRuntimeWeeklyRulesById),
      profileId: data.profileId,
      doctorId: data.doctorId,
      dayOfWeek: data.dayOfWeek,
      shiftType: data.shiftType,
      weekAlternation: data.weekAlternation ?? "all",
      participaRodizioNoite: data.participaRodizioNoite ?? false,
      noiteFixa: data.noiteFixa ?? false,
      priority: data.priority ?? 0,
      observacoes: data.observacoes ?? null,
      ativo: data.ativo ?? true,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeWeeklyRulesById.set(createdRule.id, createdRule);
    return createdRule;
  }
  if (!(await hasProfileSchema(db))) {
    return db.insert(weeklyRules).values(withoutProfileId(data));
  }
  return db.insert(weeklyRules).values(data);
}

export async function updateWeeklyRule(
  id: number,
  profileId: number,
  data: Partial<typeof weeklyRules.$inferInsert>
) {
  const db = await getDb();
  if (!db) {
    const currentRule =
      offlineRuntimeWeeklyRulesById.get(id) ??
      getOfflineWeeklyRuleById(profileId, id);

    if (!currentRule) return;

    offlineRuntimeWeeklyRulesById.set(id, {
      ...currentRule,
      ...data,
      profileId,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db
      .update(weeklyRules)
      .set(withoutProfileId(data))
      .where(eq(weeklyRules.id, id));
    return;
  }
  await db
    .update(weeklyRules)
    .set(data)
    .where(and(eq(weeklyRules.id, id), eq(weeklyRules.profileId, profileId)));
}

export async function deleteWeeklyRule(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const currentRule =
      offlineRuntimeWeeklyRulesById.get(id) ??
      getOfflineWeeklyRuleById(profileId, id);

    if (!currentRule) return;

    offlineRuntimeWeeklyRulesById.set(id, {
      ...currentRule,
      ativo: false,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db.update(weeklyRules).set({ ativo: false }).where(eq(weeklyRules.id, id));
    return;
  }
  await db
    .update(weeklyRules)
    .set({ ativo: false })
    .where(and(eq(weeklyRules.id, id), eq(weeklyRules.profileId, profileId)));
}

// Weekend rules
export async function getAllWeekendRules(profileId: number) {
  const db = await getDb();
  if (!db) {
    return mergeOfflineRuntimeRecords(
      getOfflineWeekendRules(profileId),
      offlineRuntimeWeekendRulesById
    ).filter((rule) => rule.profileId === profileId && rule.ativo);
  }
  if (!(await hasProfileSchema(db))) {
    return db.select().from(weekendRules).where(eq(weekendRules.ativo, true));
  }
  return db
    .select()
    .from(weekendRules)
    .where(
      and(eq(weekendRules.profileId, profileId), eq(weekendRules.ativo, true))
    );
}

export async function getWeekendRuleById(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    return (
      offlineRuntimeWeekendRulesById.get(id) ??
      getOfflineWeekendRuleById(profileId, id)
    );
  }
  if (!(await hasProfileSchema(db))) {
    const result = await db.select().from(weekendRules).where(eq(weekendRules.id, id)).limit(1);
    return result[0];
  }
  const result = await db
    .select()
    .from(weekendRules)
    .where(and(eq(weekendRules.id, id), eq(weekendRules.profileId, profileId)))
    .limit(1);
  return result[0];
}

export async function createWeekendRule(data: typeof weekendRules.$inferInsert) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const createdRule: OfflineRuntimeWeekendRule = {
      id: getNextOfflineRuntimeId(offlineRuntimeWeekendRulesById),
      profileId: data.profileId,
      doctorId: data.doctorId,
      dayType: data.dayType,
      shiftType: data.shiftType,
      weekOfMonth: data.weekOfMonth ?? null,
      priority: data.priority ?? 0,
      observacoes: data.observacoes ?? null,
      ativo: data.ativo ?? true,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeWeekendRulesById.set(createdRule.id, createdRule);
    return createdRule;
  }
  if (!(await hasProfileSchema(db))) {
    return db.insert(weekendRules).values(withoutProfileId(data));
  }
  return db.insert(weekendRules).values(data);
}

export async function updateWeekendRule(
  id: number,
  profileId: number,
  data: Partial<typeof weekendRules.$inferInsert>
) {
  const db = await getDb();
  if (!db) {
    const currentRule =
      offlineRuntimeWeekendRulesById.get(id) ??
      getOfflineWeekendRuleById(profileId, id);

    if (!currentRule) return;

    offlineRuntimeWeekendRulesById.set(id, {
      ...currentRule,
      ...data,
      profileId,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db
      .update(weekendRules)
      .set(withoutProfileId(data))
      .where(eq(weekendRules.id, id));
    return;
  }
  await db
    .update(weekendRules)
    .set(data)
    .where(and(eq(weekendRules.id, id), eq(weekendRules.profileId, profileId)));
}

export async function deleteWeekendRule(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const currentRule =
      offlineRuntimeWeekendRulesById.get(id) ??
      getOfflineWeekendRuleById(profileId, id);

    if (!currentRule) return;

    offlineRuntimeWeekendRulesById.set(id, {
      ...currentRule,
      ativo: false,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db.update(weekendRules).set({ ativo: false }).where(eq(weekendRules.id, id));
    return;
  }
  await db
    .update(weekendRules)
    .set({ ativo: false })
    .where(and(eq(weekendRules.id, id), eq(weekendRules.profileId, profileId)));
}

// Monthly exceptions
export async function getAllExceptions(profileId: number) {
  const db = await getDb();
  if (!db) {
    return mergeOfflineRuntimeRecords(
      getOfflineExceptions(profileId),
      offlineRuntimeExceptionsById
    )
      .filter((exception) => exception.profileId === profileId && exception.ativo)
      .map(normalizeExceptionRecord);
  }
  if (!(await hasProfileSchema(db))) {
    const result = await db
      .select()
      .from(monthlyExceptions)
      .where(eq(monthlyExceptions.ativo, true));
    return result.map(normalizeExceptionRecord);
  }
  const result = await db
    .select()
    .from(monthlyExceptions)
    .where(
      and(
        eq(monthlyExceptions.profileId, profileId),
        eq(monthlyExceptions.ativo, true)
      )
    );
  return result.map(normalizeExceptionRecord);
}

export async function getExceptionById(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const exception =
      offlineRuntimeExceptionsById.get(id) ??
      getOfflineExceptionById(profileId, id);
    return exception ? normalizeExceptionRecord(exception) : undefined;
  }
  if (!(await hasProfileSchema(db))) {
    const result = await db
      .select()
      .from(monthlyExceptions)
      .where(eq(monthlyExceptions.id, id))
      .limit(1);
    return result[0] ? normalizeExceptionRecord(result[0]) : undefined;
  }
  const result = await db
    .select()
    .from(monthlyExceptions)
    .where(
      and(eq(monthlyExceptions.id, id), eq(monthlyExceptions.profileId, profileId))
    )
    .limit(1);
  return result[0] ? normalizeExceptionRecord(result[0]) : undefined;
}

export async function getExceptionsForMonth(
  profileId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) {
    return (await getAllExceptions(profileId)).filter((exception) => {
      if (!exception.ativo) return false;

      if (exception.recurrenceType === "recurring") return true;
      if (exception.recurrenceType === "monthly") return exception.month === month;
      if (exception.recurrenceType === "annual") return exception.month === month;
      if (exception.recurrenceType === "once") {
        const specificDate = normalizeDateOnlyValue(exception.specificDate) ?? "";
        return (
          specificDate.slice(0, 4) === String(year) &&
          specificDate.slice(5, 7) === String(month).padStart(2, "0")
        );
      }

      return false;
    });
  }
  const { startDate, endDate } = getMonthDateRange(year, month);
  if (!(await hasProfileSchema(db))) {
    const result = await db
      .select()
      .from(monthlyExceptions)
      .where(
        and(
          eq(monthlyExceptions.ativo, true),
          sql`(
            (${monthlyExceptions.recurrenceType} = 'once' AND ${monthlyExceptions.specificDate} >= ${startDate} AND ${monthlyExceptions.specificDate} <= ${endDate})
            OR (${monthlyExceptions.recurrenceType} = 'monthly' AND ${monthlyExceptions.month} = ${month})
            OR (${monthlyExceptions.recurrenceType} = 'annual' AND ${monthlyExceptions.month} = ${month})
            OR ${monthlyExceptions.recurrenceType} = 'recurring'
          )`
        )
      );
    return result.map(normalizeExceptionRecord);
  }
  const result = await db
    .select()
    .from(monthlyExceptions)
    .where(
      and(
        eq(monthlyExceptions.profileId, profileId),
        eq(monthlyExceptions.ativo, true),
        sql`(
          (${monthlyExceptions.recurrenceType} = 'once' AND ${monthlyExceptions.specificDate} >= ${startDate} AND ${monthlyExceptions.specificDate} <= ${endDate})
          OR (${monthlyExceptions.recurrenceType} = 'monthly' AND ${monthlyExceptions.month} = ${month})
          OR (${monthlyExceptions.recurrenceType} = 'annual' AND ${monthlyExceptions.month} = ${month})
          OR ${monthlyExceptions.recurrenceType} = 'recurring'
        )`
      )
    );
  return result.map(normalizeExceptionRecord);
}

export async function createException(data: typeof monthlyExceptions.$inferInsert) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const createdException: OfflineRuntimeException = {
      id: getNextOfflineRuntimeId(offlineRuntimeExceptionsById),
      profileId: data.profileId,
      doctorId: data.doctorId,
      exceptionType: data.exceptionType,
      recurrenceType: data.recurrenceType ?? "once",
      specificDate: data.specificDate ?? null,
      month: data.month ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
      dayOfWeek: data.dayOfWeek ?? null,
      weekOfMonth: data.weekOfMonth ?? null,
      shiftType: data.shiftType ?? null,
      replaceDoctorId: data.replaceDoctorId ?? null,
      reason: data.reason ?? null,
      ativo: data.ativo ?? true,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeExceptionsById.set(createdException.id, createdException);
    return createdException;
  }
  if (!(await hasProfileSchema(db))) {
    return db.insert(monthlyExceptions).values(withoutProfileId(data));
  }
  return db.insert(monthlyExceptions).values(data);
}

export async function updateException(
  id: number,
  profileId: number,
  data: Partial<typeof monthlyExceptions.$inferInsert>
) {
  const db = await getDb();
  if (!db) {
    const currentException =
      offlineRuntimeExceptionsById.get(id) ??
      getOfflineExceptionById(profileId, id);

    if (!currentException) return;

    offlineRuntimeExceptionsById.set(id, {
      ...currentException,
      ...data,
      profileId,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db
      .update(monthlyExceptions)
      .set(withoutProfileId(data))
      .where(eq(monthlyExceptions.id, id));
    return;
  }
  await db
    .update(monthlyExceptions)
    .set(data)
    .where(
      and(eq(monthlyExceptions.id, id), eq(monthlyExceptions.profileId, profileId))
    );
}

export async function deleteException(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const currentException =
      offlineRuntimeExceptionsById.get(id) ??
      getOfflineExceptionById(profileId, id);

    if (!currentException) return;

    offlineRuntimeExceptionsById.set(id, {
      ...currentException,
      ativo: false,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db
      .update(monthlyExceptions)
      .set({ ativo: false })
      .where(eq(monthlyExceptions.id, id));
    return;
  }
  await db
    .update(monthlyExceptions)
    .set({ ativo: false })
    .where(
      and(eq(monthlyExceptions.id, id), eq(monthlyExceptions.profileId, profileId))
    );
}

// Unavailabilities
export async function getDateUnavailabilitiesForMonth(
  profileId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) {
    return Array.from(offlineRuntimeDateUnavailabilitiesById.values()).filter(
      (item) =>
        item.profileId === profileId &&
        String(item.unavailableDate).slice(0, 4) === String(year) &&
        String(item.unavailableDate).slice(5, 7) === String(month).padStart(2, "0")
    );
  }
  const { startDate, endDate } = getMonthDateRange(year, month);
  if (!(await hasProfileSchema(db))) {
    return db
      .select()
      .from(dateUnavailabilities)
      .where(
        and(
          gte(dateUnavailabilities.unavailableDate, startDate as unknown as Date),
          lte(dateUnavailabilities.unavailableDate, endDate as unknown as Date)
        )
      );
  }
  return db
    .select()
    .from(dateUnavailabilities)
    .where(
      and(
        eq(dateUnavailabilities.profileId, profileId),
        gte(dateUnavailabilities.unavailableDate, startDate as unknown as Date),
        lte(dateUnavailabilities.unavailableDate, endDate as unknown as Date)
      )
    );
}

export async function createDateUnavailability(
  data: typeof dateUnavailabilities.$inferInsert
) {
  const db = await getDb();
  if (!db) {
    const createdItem: OfflineRuntimeDateUnavailability = {
      id: getNextOfflineRuntimeId(offlineRuntimeDateUnavailabilitiesById),
      profileId: data.profileId,
      doctorId: data.doctorId,
      unavailableDate: data.unavailableDate,
      reason: data.reason ?? null,
      createdAt: new Date(),
    };

    offlineRuntimeDateUnavailabilitiesById.set(createdItem.id, createdItem);
    return createdItem;
  }
  if (!(await hasProfileSchema(db))) {
    return db.insert(dateUnavailabilities).values(withoutProfileId(data));
  }
  return db.insert(dateUnavailabilities).values(data);
}

export async function deleteDateUnavailability(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const currentItem = offlineRuntimeDateUnavailabilitiesById.get(id);
    if (currentItem?.profileId === profileId) {
      offlineRuntimeDateUnavailabilitiesById.delete(id);
    }
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db.delete(dateUnavailabilities).where(eq(dateUnavailabilities.id, id));
    return;
  }
  await db
    .delete(dateUnavailabilities)
    .where(
      and(
        eq(dateUnavailabilities.id, id),
        eq(dateUnavailabilities.profileId, profileId)
      )
    );
}

export async function getFixedUnavailabilitiesByDoctor(
  doctorId: number,
  profileId: number
) {
  const db = await getDb();
  if (!db) {
    return Array.from(offlineRuntimeFixedUnavailabilitiesById.values()).filter(
      (item) => item.profileId === profileId && item.doctorId === doctorId
    );
  }
  if (!(await hasProfileSchema(db))) {
    return db
      .select()
      .from(fixedUnavailabilities)
      .where(eq(fixedUnavailabilities.doctorId, doctorId));
  }
  return db
    .select()
    .from(fixedUnavailabilities)
    .where(
      and(
        eq(fixedUnavailabilities.doctorId, doctorId),
        eq(fixedUnavailabilities.profileId, profileId)
      )
    );
}

export async function createFixedUnavailability(
  data: typeof fixedUnavailabilities.$inferInsert
) {
  const db = await getDb();
  if (!db) {
    const createdItem: OfflineRuntimeFixedUnavailability = {
      id: getNextOfflineRuntimeId(offlineRuntimeFixedUnavailabilitiesById),
      profileId: data.profileId,
      doctorId: data.doctorId,
      userId: data.userId ?? null,
      dayOfWeek: data.dayOfWeek,
      shiftType: data.shiftType,
      createdAt: new Date(),
    };

    offlineRuntimeFixedUnavailabilitiesById.set(createdItem.id, createdItem);
    return createdItem;
  }
  if (!(await hasProfileSchema(db))) {
    return db.insert(fixedUnavailabilities).values(withoutProfileId(data));
  }
  return db.insert(fixedUnavailabilities).values(data);
}

export async function deleteFixedUnavailability(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const current = offlineRuntimeFixedUnavailabilitiesById.get(id);
    if (current?.profileId === profileId) {
      offlineRuntimeFixedUnavailabilitiesById.delete(id);
    }
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db
      .delete(fixedUnavailabilities)
      .where(eq(fixedUnavailabilities.id, id));
    return;
  }
  await db
    .delete(fixedUnavailabilities)
    .where(
      and(
        eq(fixedUnavailabilities.id, id),
        eq(fixedUnavailabilities.profileId, profileId)
      )
    );
}

// Holidays are shared by every schedule profile
export async function getHolidaysForMonth(year: number, month: number) {
  const db = await getDb();
  if (!db) return getOfflineHolidaysForMonth(year, month);
  const { startDate, endDate } = getMonthDateRange(year, month);
  return db.select().from(holidays).where(
    sql`(
      (${holidays.recurrenceType} = 'once' AND ${holidays.holidayDate} >= ${startDate} AND ${holidays.holidayDate} <= ${endDate})
      OR (${holidays.recurrenceType} = 'annual' AND MONTH(${holidays.holidayDate}) = ${month})
    )`
  );
}

export async function getAllHolidays() {
  const db = await getDb();
  if (!db) return getOfflineHolidays();
  return db.select().from(holidays);
}

export async function createHoliday(data: typeof holidays.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(holidays).values(data);
}

export async function deleteHoliday(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(holidays).where(eq(holidays.id, id));
}

// Schedules
export async function getScheduleByMonth(
  profileId: number,
  year: number,
  month: number
) {
  const db = await getDb();
  if (!db) {
    return (
      getOfflineRuntimeScheduleByMonth(profileId, year, month) ??
      getOfflineScheduleByMonth(profileId, year, month)
    );
  }
  if (!(await hasProfileSchema(db))) {
    const result = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.year, year), eq(schedules.month, month)))
      .limit(1);
    return result[0];
  }
  const result = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.profileId, profileId),
        eq(schedules.year, year),
        eq(schedules.month, month)
      )
    )
    .limit(1);
  return result[0];
}

export async function getScheduleById(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    return getOfflineRuntimeScheduleById(id) ?? getOfflineScheduleById(profileId, id);
  }
  if (!(await hasProfileSchema(db))) {
    const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return result[0];
  }
  const result = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.profileId, profileId)))
    .limit(1);
  return result[0];
}

export async function createSchedule(data: typeof schedules.$inferInsert) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    return storeOfflineRuntimeSchedule({
      id: buildOfflineRuntimeScheduleId(data.profileId ?? LEGACY_PROFILE_ID, data.year, data.month),
      profileId: data.profileId ?? LEGACY_PROFILE_ID,
      year: data.year,
      month: data.month,
      status: data.status ?? "draft",
      generatedAt: data.generatedAt ?? null,
      approvedAt: data.approvedAt ?? null,
      approvedBy: data.approvedBy ?? null,
      balanceScore: data.balanceScore ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (!(await hasProfileSchema(db))) {
    return db.insert(schedules).values(withoutProfileId(data));
  }
  return db.insert(schedules).values(data);
}

export async function updateSchedule(
  id: number,
  profileId: number,
  data: Partial<typeof schedules.$inferInsert>
) {
  const db = await getDb();
  if (!db) {
    const existing =
      getOfflineRuntimeScheduleById(id) ?? getOfflineScheduleById(profileId, id);

    if (!existing) {
      throw new Error("Schedule not found");
    }

    storeOfflineRuntimeSchedule({
      ...existing,
      ...data,
      id,
      profileId,
      updatedAt: new Date(),
    });
    return;
  }
  if (!(await hasProfileSchema(db))) {
    await db.update(schedules).set(withoutProfileId(data)).where(eq(schedules.id, id));
    return;
  }
  await db
    .update(schedules)
    .set(data)
    .where(and(eq(schedules.id, id), eq(schedules.profileId, profileId)));
}

// Schedule entries
export async function getEntriesForSchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) {
    const runtimeEntries = offlineRuntimeEntriesByScheduleId.get(scheduleId);
    if (runtimeEntries) {
      return runtimeEntries;
    }

    const offlineProfile = listOfflineScheduleProfiles().find((profile) =>
      Boolean(getOfflineScheduleById(profile.id, scheduleId))
    );
    return offlineProfile
      ? getOfflineEntriesForSchedule(offlineProfile.id, scheduleId)
      : [];
  }
  return db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.scheduleId, scheduleId));
}

export async function createEntry(data: typeof scheduleEntries.$inferInsert) {
  const db = await getDb();
  if (!db) {
    const currentEntries = [...(await getEntriesForSchedule(data.scheduleId))];
    const nextId =
      currentEntries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1;
    const now = new Date();
    const entry: OfflineRuntimeEntry = {
      id: nextId,
      scheduleId: data.scheduleId,
      doctorId: data.doctorId,
      entryDate: data.entryDate,
      shiftType: data.shiftType,
      isFixed: data.isFixed ?? false,
      isManualOverride: data.isManualOverride ?? false,
      isLocked: data.isLocked ?? false,
      conflictWarning: data.conflictWarning ?? null,
      confirmationStatus: data.confirmationStatus ?? "pending",
      overrideJustification: data.overrideJustification ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeEntriesByScheduleId.set(data.scheduleId, [...currentEntries, entry]);
    return entry;
  }
  return db.insert(scheduleEntries).values(data);
}

export async function updateEntry(
  id: number,
  data: Partial<typeof scheduleEntries.$inferInsert>
) {
  const db = await getDb();
  if (!db) {
    for (const [scheduleId, entries] of Array.from(
      offlineRuntimeEntriesByScheduleId.entries()
    )) {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index < 0) continue;

      const currentEntry = entries[index]!;
      const nextEntries = [...entries];
      nextEntries[index] = {
        ...currentEntry,
        ...data,
        id,
        scheduleId,
        updatedAt: new Date(),
      };
      offlineRuntimeEntriesByScheduleId.set(scheduleId, nextEntries);
      return;
    }

    throw new Error("Entry not found");
  }
  await db.update(scheduleEntries).set(data).where(eq(scheduleEntries.id, id));
}

export async function deleteEntry(id: number) {
  const db = await getDb();
  if (!db) {
    for (const [scheduleId, entries] of Array.from(
      offlineRuntimeEntriesByScheduleId.entries()
    )) {
      if (!entries.some((entry) => entry.id === id)) continue;
      offlineRuntimeEntriesByScheduleId.set(
        scheduleId,
        entries.filter((entry) => entry.id !== id)
      );
      return;
    }

    throw new Error("Entry not found");
  }
  await db.delete(scheduleEntries).where(eq(scheduleEntries.id, id));
}

export async function deleteEntriesForSchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) {
    offlineRuntimeEntriesByScheduleId.set(scheduleId, []);
    return;
  }
  await db
    .delete(scheduleEntries)
    .where(eq(scheduleEntries.scheduleId, scheduleId));
}

export async function deleteSchedule(id: number) {
  const db = await getDb();
  if (!db) {
    const schedule = offlineRuntimeSchedulesById.get(id);
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    offlineRuntimeEntriesByScheduleId.delete(id);
    offlineRuntimeSchedulesById.delete(id);
    offlineRuntimeSchedulesByMonth.delete(
      `${schedule.profileId}:${schedule.year}:${schedule.month}`
    );
    return;
  }

  await db.delete(schedules).where(eq(schedules.id, id));
}

// Night rotation state
export async function getNightRotationState() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(nightRotationState);
}

export async function upsertNightRotationState(
  doctorId: number,
  data: Partial<typeof nightRotationState.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .insert(nightRotationState)
    .values({ doctorId, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

// Swap requests
export async function listSwapRequestsForSchedule(
  scheduleId: number,
  profileId: number
) {
  const db = await getDb();
  if (!db) {
    return Array.from(offlineRuntimeSwapRequestsById.values()).filter(
      (request) =>
        request.scheduleId === scheduleId && request.profileId === profileId
    );
  }

  return db
    .select()
    .from(swapRequests)
    .where(
      and(
        eq(swapRequests.scheduleId, scheduleId),
        eq(swapRequests.profileId, profileId)
      )
    );
}

export async function getSwapRequestById(id: number, profileId: number) {
  const db = await getDb();
  if (!db) {
    const request = offlineRuntimeSwapRequestsById.get(id);
    return request?.profileId === profileId ? request : undefined;
  }

  const result = await db
    .select()
    .from(swapRequests)
    .where(and(eq(swapRequests.id, id), eq(swapRequests.profileId, profileId)))
    .limit(1);

  return result[0];
}

export async function createSwapRequest(data: typeof swapRequests.$inferInsert) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const request: OfflineRuntimeSwapRequest = {
      id: getNextOfflineRuntimeId(offlineRuntimeSwapRequestsById),
      profileId: data.profileId,
      scheduleId: data.scheduleId,
      scheduleEntryId: data.scheduleEntryId,
      requesterUserId: data.requesterUserId ?? null,
      requesterDoctorId: data.requesterDoctorId ?? null,
      currentDoctorId: data.currentDoctorId,
      targetDoctorId: data.targetDoctorId ?? null,
      requestType: data.requestType ?? "direct_swap",
      status: data.status ?? "pending",
      reason: data.reason ?? null,
      decisionNote: data.decisionNote ?? null,
      reviewedByUserId: data.reviewedByUserId ?? null,
      reviewedAt: data.reviewedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeSwapRequestsById.set(request.id, request);
    return request;
  }

  await db.insert(swapRequests).values(data);

  const result = await db
    .select()
    .from(swapRequests)
    .where(
      and(
        eq(swapRequests.scheduleEntryId, data.scheduleEntryId),
        eq(swapRequests.profileId, data.profileId)
      )
    );

  return result[result.length - 1];
}

export async function updateSwapRequest(
  id: number,
  profileId: number,
  data: Partial<typeof swapRequests.$inferInsert>
) {
  const db = await getDb();
  if (!db) {
    const currentRequest = offlineRuntimeSwapRequestsById.get(id);
    if (!currentRequest || currentRequest.profileId !== profileId) return;

    offlineRuntimeSwapRequestsById.set(id, {
      ...currentRequest,
      ...data,
      id,
      profileId,
      updatedAt: new Date(),
    });
    return;
  }

  await db
    .update(swapRequests)
    .set(data)
    .where(and(eq(swapRequests.id, id), eq(swapRequests.profileId, profileId)));
}

// Notification outbox
export async function createNotificationDispatch(
  data: typeof notificationDispatches.$inferInsert
) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const dispatch: OfflineRuntimeNotificationDispatch = {
      id: getNextOfflineRuntimeId(offlineRuntimeNotificationDispatchesById),
      profileId: data.profileId,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      recipientDoctorId: data.recipientDoctorId ?? null,
      recipientUserId: data.recipientUserId ?? null,
      channel: data.channel,
      templateKey: data.templateKey,
      destination: data.destination ?? null,
      payload: data.payload ?? null,
      status: data.status ?? "queued",
      scheduledFor: data.scheduledFor ?? null,
      sentAt: data.sentAt ?? null,
      failedAt: data.failedAt ?? null,
      failureReason: data.failureReason ?? null,
      createdAt: now,
      updatedAt: now,
    };

    offlineRuntimeNotificationDispatchesById.set(dispatch.id, dispatch);
    return dispatch;
  }

  await db.insert(notificationDispatches).values(data);
}

// Audit logs
export async function createAuditLog(data: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  if (!(await hasProfileSchema(db))) {
    await db.insert(auditLogs).values(withoutProfileId(data));
    return;
  }
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogsForSchedule(
  scheduleId: number,
  profileId: number
) {
  const db = await getDb();
  if (!db) return [];
  if (!(await hasProfileSchema(db))) {
    return db.select().from(auditLogs).where(eq(auditLogs.scheduleId, scheduleId));
  }
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.scheduleId, scheduleId), eq(auditLogs.profileId, profileId)));
}

// SaaS Management
/**
 * Super Admin: Lists ALL profiles in the system with their primary owners
 */
export async function listAllProfiles() {
  const db = await getDb();
  if (!db) return getOfflineRuntimeScheduleProfiles();

  const rows = await db
    .select({
      profile: scheduleProfiles,
      owner: users,
    })
    .from(scheduleProfiles)
    .leftJoin(userProfiles, and(
      eq(scheduleProfiles.id, userProfiles.profileId),
      eq(userProfiles.role, "owner")
    ))
    .leftJoin(users, eq(userProfiles.userId, users.id))
    .where(eq(scheduleProfiles.active, true));

  return rows.map(row => ({
    ...row.profile,
    ownerName: row.owner?.name ?? "Sem proprietario",
    ownerEmail: row.owner?.email ?? "N/A",
  }));
}

/**
 * Client Admin: Lists all users that have access to a specific profile
 */
export async function listUsersByProfile(profileId: number): Promise<ManagedLocalUser[]> {
  const db = await getDb();
  if (!db) return listOfflineManagedLocalUsers();

  const rows = await db
    .select({
      user: users,
      credential: localUserCredentials,
      profileLink: userProfiles,
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .innerJoin(localUserCredentials, eq(users.id, localUserCredentials.userId))
    .where(eq(userProfiles.profileId, profileId));

  return rows.map(({ user, credential }) =>
    toManagedLocalUser(user, credential)
  ).sort(sortManagedLocalUsers);
}

/**
 * Super Admin: KPIs for the SaaS Dashboard
 */
export async function getGlobalStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: offlineRuntimeManagedUsersById.size,
      totalProfiles: offlineRuntimeScheduleProfilesById.size,
      totalEntries: Array.from(offlineRuntimeEntriesByScheduleId.values()).flat().length,
      premiumUsers: Array.from(offlineRuntimeManagedUsersById.values()).filter(u => u.isPaid).length,
    };
  }

  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [profilesCount] = await db.select({ count: sql<number>`count(*)` }).from(scheduleProfiles);
  const [entriesCount] = await db.select({ count: sql<number>`count(*)` }).from(scheduleEntries);
  const [premiumCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isPaid, true));

  return {
    totalUsers: Number(usersCount?.count ?? 0),
    totalProfiles: Number(profilesCount?.count ?? 0),
    totalEntries: Number(entriesCount?.count ?? 0),
    premiumUsers: Number(premiumCount?.count ?? 0),
  };
}

/**
 * Super Admin: Notification Queue Health
 */
export async function getNotificationHealth() {
  const db = await getDb();
  if (!db) return [];

  const stats = await db
    .select({
      status: notificationDispatches.status,
      count: sql<number>`count(*)`,
    })
    .from(notificationDispatches)
    .groupBy(notificationDispatches.status);

  return stats.map(s => ({
    status: s.status,
    count: Number(s.count),
  }));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserSubscription(userId: number, data: Partial<{
  isPaid: boolean;
  maxProfiles: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  role: typeof users.$inferSelect["role"];
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

/**
 * UTILITY: Força a sincronização das colunas faltantes na VPS (HostGator)
 * Isso resolve o erro de "Failed query: select profileId..."
 */
export async function repairDatabaseSchema() {
  const db = await getDb();
  if (!db) return { success: false, message: "Modo offline não suporta reparo de banco." };

  const tablesToUpdate = [
    "doctors",
    "fixed_unavailabilities",
    "date_unavailabilities",
    "weekly_rules",
    "weekend_rules",
    "monthly_exceptions",
    "schedules",
    "schedule_entries",
    "swap_requests",
    "notification_dispatches",
    "audit_logs"
  ];

  const results: string[] = [];

  for (const table of tablesToUpdate) {
    try {
      // Tenta adicionar profileId se não existir
      await db.execute(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`profileId\` INT NOT NULL DEFAULT 1`));
      results.push(`Tabela ${table}: Coluna 'profileId' adicionada.`);
    } catch (error) {
      // Ignora erro de coluna já existente
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const msg = (error as any).message;
        if (msg.includes("Duplicate column name") || msg.includes("already exists")) {
          // Já existe, tudo bem
        } else {
          results.push(`Tabela ${table}: Erro ao tentar adicionar profileId: ${msg}`);
        }
      }
    }

    // Tabela doctors precisa da coluna 'ativo' também se for muito antiga
    if (table === "doctors") {
      try {
        await db.execute(sql.raw(`ALTER TABLE \`doctors\` ADD COLUMN \`ativo\` BOOLEAN NOT NULL DEFAULT 1`));
        results.push(`Tabela doctors: Coluna 'ativo' adicionada.`);
      } catch (error) {
        // Ignora erro de coluna já existente
      }
    }
  }

  // Reseta o cache de detecção de esquema para forçar revalidação
  _hasProfileSchema = null;
  
  return { 
    success: true, 
    results, 
    message: "Processo de sincronização concluído. Tente acessar a clínica novamente." 
  };
}
