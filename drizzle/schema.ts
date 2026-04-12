import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  tinyint,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users (Auth) ────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "coordinator", "viewer", "staff"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  maxProfiles: int("maxProfiles").default(1).notNull(),
  isPaid: boolean("isPaid").default(false).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 64 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const localUserCredentials = mysqlTable("local_user_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LocalUserCredential = typeof localUserCredentials.$inferSelect;
export type InsertLocalUserCredential =
  typeof localUserCredentials.$inferInsert;

export const authTokens = mysqlTable("auth_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  type: mysqlEnum("type", ["email_verification", "password_reset"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthToken = typeof authTokens.$inferSelect;
export type InsertAuthToken = typeof authTokens.$inferInsert;

export const scheduleProfiles = mysqlTable("schedule_profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleProfile = typeof scheduleProfiles.$inferSelect;
export type InsertScheduleProfile = typeof scheduleProfiles.$inferInsert;

export const userProfiles = mysqlTable(
  "user_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    profileId: int("profileId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "viewer"]).default("viewer").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("userId_idx").on(table.userId),
      profileIdIdx: index("profileId_idx").on(table.profileId),
      uniqueUserProfile: uniqueIndex("unique_user_profile").on(
        table.userId,
        table.profileId
      ),
    };
  }
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Doctors ─────────────────────────────────────────────────────────────────
export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 64 }).notNull(),
  category: mysqlEnum("category", ["titular", "resident", "sesab"]).default("titular").notNull(),
  // Vínculos
  hasSus: boolean("hasSus").default(false).notNull(),
  hasConvenio: boolean("hasConvenio").default(false).notNull(),
  // Disponibilidade por turno
  canManhaSus: boolean("canManhaSus").default(false).notNull(),
  canManhaConvenio: boolean("canManhaConvenio").default(false).notNull(),
  canTardeSus: boolean("canTardeSus").default(false).notNull(),
  canTardeConvenio: boolean("canTardeConvenio").default(false).notNull(),
  canNoite: boolean("canNoite").default(false).notNull(),
  canFinalDeSemana: boolean("canFinalDeSemana").default(false).notNull(),
  canSabado: boolean("canSabado").default(false).notNull(),
  canDomingo: boolean("canDomingo").default(false).notNull(),
  can24h: boolean("can24h").default(false).notNull(),
  participaRodizioNoite: boolean("participaRodizioNoite").default(false).notNull(),
  // Limites mensais
  limiteplantoesmes: int("limiteplantoesmes").default(0),
  limiteNoitesMes: int("limiteNoitesMes").default(0),
  limiteFdsMes: int("limiteFdsMes").default(0),
  // Configurações
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta"]).default("media").notNull(),
  specialty: varchar("specialty", { length: 128 }),
  cor: varchar("cor", { length: 16 }).default("#3B82F6").notNull(),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;

// ─── Fixed Unavailabilities (weekly recurring) ───────────────────────────────
export const fixedUnavailabilities = mysqlTable("fixed_unavailabilities", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  doctorId: int("doctorId").notNull(),
  // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayOfWeek: tinyint("dayOfWeek").notNull(),
  shiftType: mysqlEnum("shiftType", ["manha_sus", "manha_convenio", "tarde_sus", "tarde_convenio", "noite", "all_day"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Date-specific Unavailabilities ──────────────────────────────────────────
export const dateUnavailabilities = mysqlTable("date_unavailabilities", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  doctorId: int("doctorId").notNull(),
  unavailableDate: date("unavailableDate").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Weekly Fixed Rules ───────────────────────────────────────────────────────
export const weeklyRules = mysqlTable("weekly_rules", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  doctorId: int("doctorId").notNull(),
  dayOfWeek: tinyint("dayOfWeek").notNull(), // 1=Monday ... 5=Friday
  shiftType: mysqlEnum("shiftType", ["manha_sus", "manha_convenio", "tarde_sus", "tarde_convenio", "noite"]).notNull(),
  // Alternância: null = toda semana, 1 = 1ª e 3ª, 2 = 2ª e 4ª
  weekAlternation: mysqlEnum("weekAlternation", ["all", "odd", "even"]).default("all").notNull(),
  participaRodizioNoite: boolean("participaRodizioNoite").default(false).notNull(),
  noiteFixa: boolean("noiteFixa").default(false).notNull(),
  priority: int("priority").default(0).notNull(),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Weekend Rules ────────────────────────────────────────────────────────────
export const weekendRules = mysqlTable("weekend_rules", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  doctorId: int("doctorId").notNull(),
  dayType: mysqlEnum("dayType", ["sabado", "domingo", "ambos"]).notNull(),
  shiftType: mysqlEnum("shiftType", ["manha_sus", "manha_convenio", "tarde_sus", "tarde_convenio", "noite", "plantao_24h"]).notNull(),
  // Qual final de semana do mês: null = todos, 1 = 1º, 2 = 2º, 3 = 3º, 4 = 4º
  weekOfMonth: tinyint("weekOfMonth"),
  priority: int("priority").default(0).notNull(),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Monthly Exceptions ───────────────────────────────────────────────────────
export const monthlyExceptions = mysqlTable("monthly_exceptions", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  doctorId: int("doctorId").notNull(),
  exceptionType: mysqlEnum("exceptionType", ["block", "force_shift", "replace", "swap"]).notNull(),
  recurrenceType: mysqlEnum("recurrenceType", ["annual", "monthly", "once", "recurring"]).default("once").notNull(),
  // Para exceções pontuais
  specificDate: date("specificDate"),
  // Para exceções mensais/anuais
  month: tinyint("month"), // 1-12
  dayOfMonth: tinyint("dayOfMonth"),
  // Para exceções semanais recorrentes
  dayOfWeek: tinyint("dayOfWeek"),
  weekOfMonth: tinyint("weekOfMonth"),
  shiftType: mysqlEnum("shiftType", ["manha_sus", "manha_convenio", "tarde_sus", "tarde_convenio", "noite", "plantao_24h", "all_day"]),
  replaceDoctorId: int("replaceDoctorId"),
  reason: varchar("reason", { length: 512 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const holidays = mysqlTable("holidays", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  holidayDate: date("holidayDate").notNull(),
  isNational: boolean("isNational").default(true).notNull(),
  recurrenceType: mysqlEnum("recurrenceType", ["annual", "once"]).default("annual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Monthly Schedules ────────────────────────────────────────────────────────
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  year: int("year").notNull(),
  month: tinyint("month").notNull(), // 1-12
  status: mysqlEnum("status", ["draft", "preliminary", "approved", "locked"]).default("draft").notNull(),
  generatedAt: timestamp("generatedAt"),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  balanceScore: int("balanceScore"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

// ─── Schedule Entries ─────────────────────────────────────────────────────────
export const scheduleEntries = mysqlTable("schedule_entries", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull(),
  doctorId: int("doctorId").notNull(),
  entryDate: date("entryDate").notNull(),
  shiftType: mysqlEnum("shiftType", ["manha_sus", "manha_convenio", "tarde_sus", "tarde_convenio", "noite", "plantao_24h"]).notNull(),
  isFixed: boolean("isFixed").default(false).notNull(),
  isManualOverride: boolean("isManualOverride").default(false).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  confirmationStatus: mysqlEnum("confirmationStatus", ["pending", "confirmed", "adjustment_requested"]).default("pending").notNull(),
  conflictWarning: text("conflictWarning"),
  overrideJustification: text("overrideJustification"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
export type InsertScheduleEntry = typeof scheduleEntries.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const swapRequests = mysqlTable(
  "swap_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull(),
    scheduleId: int("scheduleId").notNull(),
    scheduleEntryId: int("scheduleEntryId").notNull(),
    requesterUserId: int("requesterUserId"),
    requesterDoctorId: int("requesterDoctorId"),
    currentDoctorId: int("currentDoctorId").notNull(),
    targetDoctorId: int("targetDoctorId"),
    requestType: mysqlEnum("requestType", ["direct_swap", "open_cover"]).default("direct_swap").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
    reason: varchar("reason", { length: 512 }),
    decisionNote: varchar("decisionNote", { length: 512 }),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    profileIdIdx: index("swap_requests_profile_id_idx").on(table.profileId),
    scheduleIdIdx: index("swap_requests_schedule_id_idx").on(table.scheduleId),
    entryIdIdx: index("swap_requests_entry_id_idx").on(table.scheduleEntryId),
    statusIdx: index("swap_requests_status_idx").on(table.status),
  })
);

export type SwapRequest = typeof swapRequests.$inferSelect;
export type InsertSwapRequest = typeof swapRequests.$inferInsert;

export const notificationDispatches = mysqlTable(
  "notification_dispatches",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull(),
    entityType: varchar("entityType", { length: 64 }).notNull(),
    entityId: int("entityId"),
    recipientDoctorId: int("recipientDoctorId"),
    recipientUserId: int("recipientUserId"),
    channel: mysqlEnum("channel", ["email", "whatsapp"]).notNull(),
    templateKey: varchar("templateKey", { length: 64 }).notNull(),
    destination: varchar("destination", { length: 255 }),
    payload: json("payload"),
    status: mysqlEnum("status", ["queued", "sent", "failed", "cancelled"]).default("queued").notNull(),
    scheduledFor: timestamp("scheduledFor"),
    sentAt: timestamp("sentAt"),
    failedAt: timestamp("failedAt"),
    failureReason: text("failureReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    profileIdIdx: index("notification_dispatches_profile_id_idx").on(table.profileId),
    statusIdx: index("notification_dispatches_status_idx").on(table.status),
    scheduledForIdx: index("notification_dispatches_scheduled_for_idx").on(table.scheduledFor),
  })
);

export type NotificationDispatch = typeof notificationDispatches.$inferSelect;
export type InsertNotificationDispatch = typeof notificationDispatches.$inferInsert;

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  scheduleId: int("scheduleId"),
  userId: int("userId"),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  previousValue: json("previousValue"),
  newValue: json("newValue"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Night Rotation State ─────────────────────────────────────────────────────
export const nightRotationState = mysqlTable("night_rotation_state", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: int("doctorId").notNull().unique(),
  lastNightDate: date("lastNightDate"),
  totalNightsThisMonth: int("totalNightsThisMonth").default(0).notNull(),
  rotationPosition: int("rotationPosition").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
