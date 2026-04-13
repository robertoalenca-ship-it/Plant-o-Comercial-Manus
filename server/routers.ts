import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { sdk } from "./_core/sdk";
import {
  adminProcedure,
  managerProcedure,
  managerProfileProcedure,
  profileProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  staffProcedure,
} from "./_core/trpc";
import {
  createAuditLog,
  createDateUnavailability,
  createDoctor,
  createManagedLocalUser,
  createSwapRequest,
  createEntry,
  createException,
  createFixedUnavailability,
  createHoliday,
  createSchedule,
  createScheduleProfile,
  createWeekendRule,
  createWeeklyRule,
  deleteDateUnavailability,
  deleteDoctor,
  deleteEntry,
  deleteEntriesForSchedule,
  deleteException,
  deleteFixedUnavailability,
  deleteHoliday,
  deleteManagedLocalUser,
  deleteWeekendRule,
  deleteWeeklyRule,
  getAllDoctors,
  getAllExceptions,
  getAllHolidays,
  getAllWeekendRules,
  getAllWeeklyRules,
  getAuditLogsForSchedule,
  getDateUnavailabilitiesForMonth,
  getDoctorById,
  getEntriesForSchedule,
  getExceptionById,
  getExceptionsForMonth,
  getFixedUnavailabilitiesByDoctor,
  getGlobalStats,
  getHolidaysForMonth,
  getManagedLocalUserByEmail,
  getNotificationHealth,
  getScheduleById,
  getScheduleByMonth,
  getSwapRequestById,
  getWeekendRuleById,
  getWeeklyRuleById,
  listAllProfiles,
  listManagedLocalUsers,
  listScheduleProfiles,
  listSwapRequestsForSchedule,
  listUsersByProfile,
  setManagedLocalUserActive,
  createAuthToken,
  verifyAuthToken,
  setEmailVerified,
  updateLocalUserPassword,
  updateEntry,
  updateSwapRequest,
  upsertUser,
  updateDoctor,
  updateException,
  updateSchedule,
  updateWeekendRule,
  updateWeeklyRule,
  getUserById,
  updateUserSubscription,
} from "./db";
import { queueDoctorNotifications } from "./notifications";
import { stripe, STRIPE_PRICES } from "./lib/stripe";
import {
  applyOrthopedicsBaseline,
  resolveImportedDoctorLabels,
} from "./referenceBaseline";
import {
  buildLocalOpenId,
  hashLocalPassword,
  normalizeEmail,
  verifyLocalPassword,
} from "./localPasswordAuth";
import { generateSchedule, validateEntry } from "./scheduleGenerator";

const INITIAL_DOCTORS = [
  { name: "Humberto", shortName: "Humberto", category: "titular" as const, hasSus: true, hasConvenio: true, canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true, can24h: false, participaRodizioNoite: true, cor: "#3B82F6" },
  { name: "Luiz Rogerio", shortName: "L. Rogerio", category: "titular" as const, hasSus: true, hasConvenio: true, canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true, can24h: false, participaRodizioNoite: true, cor: "#10B981" },
  { name: "Berg", shortName: "Berg", category: "titular" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: true, canFinalDeSemana: false, canSabado: false, canDomingo: false, can24h: false, participaRodizioNoite: true, cor: "#F59E0B" },
  { name: "Nelio", shortName: "Nelio", category: "titular" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: true, canFinalDeSemana: true, canSabado: false, canDomingo: true, can24h: false, participaRodizioNoite: true, cor: "#8B5CF6" },
  { name: "Erisvaldo", shortName: "Erisvaldo", category: "titular" as const, hasSus: false, hasConvenio: true, canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true, can24h: false, participaRodizioNoite: false, cor: "#EF4444" },
  { name: "Daniel Osamu", shortName: "D. Osamu", category: "titular" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: false, canFinalDeSemana: false, canSabado: false, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#06B6D4" },
  { name: "Juarez", shortName: "Juarez", category: "sesab" as const, hasSus: true, hasConvenio: true, canManhaSus: false, canManhaConvenio: false, canTardeSus: false, canTardeConvenio: false, canNoite: false, canFinalDeSemana: false, canSabado: false, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#84CC16", ativo: false },
  { name: "Marcela", shortName: "Marcela", category: "titular" as const, hasSus: false, hasConvenio: true, canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true, canNoite: false, canFinalDeSemana: true, canSabado: false, canDomingo: true, can24h: false, participaRodizioNoite: false, cor: "#F97316" },
  { name: "Luan", shortName: "Luan", category: "titular" as const, hasSus: false, hasConvenio: true, canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true, canNoite: true, canFinalDeSemana: false, canSabado: false, canDomingo: false, can24h: false, participaRodizioNoite: true, cor: "#EC4899" },
  { name: "Fernando Melo", shortName: "F. Melo", category: "sesab" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: false, canTardeConvenio: false, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: false, can24h: false, participaRodizioNoite: true, cor: "#14B8A6" },
  { name: "Rigel", shortName: "Rigel", category: "titular" as const, hasSus: true, hasConvenio: false, canManhaSus: false, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: true, canFinalDeSemana: false, canSabado: false, canDomingo: false, can24h: false, participaRodizioNoite: true, cor: "#6366F1" },
  { name: "Daniel Souza", shortName: "D. Souza", category: "titular" as const, hasSus: true, hasConvenio: true, canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true, can24h: false, participaRodizioNoite: true, cor: "#0EA5E9" },
  { name: "Breno", shortName: "Breno", category: "sesab" as const, hasSus: true, hasConvenio: false, canManhaSus: false, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true, can24h: false, participaRodizioNoite: true, cor: "#D97706" },
  { name: "Danilo Freire", shortName: "D. Freire", category: "sesab" as const, hasSus: false, hasConvenio: true, canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true, canNoite: false, canFinalDeSemana: false, canSabado: false, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#7C3AED" },
  { name: "Italo Bacellar", shortName: "I. Bacellar", category: "titular" as const, hasSus: true, hasConvenio: true, canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: false, can24h: true, participaRodizioNoite: true, cor: "#BE185D" },
  { name: "Roberto Filho", shortName: "R. Filho", category: "titular" as const, hasSus: true, hasConvenio: true, canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true, canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true, can24h: true, participaRodizioNoite: false, cor: "#059669" },
  { name: "Caio Petruz", shortName: "C. Petruz", category: "sesab" as const, hasSus: true, hasConvenio: true, canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true, canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#DC2626" },
  { name: "Danilo Fonseca", shortName: "D. Fonseca", category: "sesab" as const, hasSus: true, hasConvenio: true, canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true, canNoite: true, canFinalDeSemana: true, canSabado: false, canDomingo: true, can24h: false, participaRodizioNoite: false, cor: "#7C2D12" },
  { name: "Caio Silva", shortName: "C. Silva", category: "resident" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#1D4ED8" },
  { name: "Walesca", shortName: "Walesca", category: "resident" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#9D174D" },
  { name: "Thaiane", shortName: "Thaiane", category: "resident" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#065F46" },
  { name: "Lara", shortName: "Lara", category: "resident" as const, hasSus: true, hasConvenio: false, canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false, canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false, can24h: false, participaRodizioNoite: false, cor: "#92400E" },
];

const shiftTypeEnum = z.enum([
  "manha_sus",
  "manha_convenio",
  "tarde_sus",
  "tarde_convenio",
  "noite",
  "plantao_24h",
]);

const scheduleWorkbookEntrySchema = z.object({
  doctorName: z.string().trim().min(1),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: shiftTypeEnum,
  sourceLabel: z.string().trim().max(120).optional(),
});

const doctorSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  specialty: z.string().optional().nullable(),
  category: z.enum(["titular", "resident", "sesab"]),
  hasSus: z.boolean(),
  hasConvenio: z.boolean(),
  canManhaSus: z.boolean(),
  canManhaConvenio: z.boolean(),
  canTardeSus: z.boolean(),
  canTardeConvenio: z.boolean(),
  canNoite: z.boolean(),
  canFinalDeSemana: z.boolean(),
  canSabado: z.boolean(),
  canDomingo: z.boolean(),
  can24h: z.boolean(),
  participaRodizioNoite: z.boolean(),
  limiteplantoesmes: z.number().optional(),
  limiteNoitesMes: z.number().optional(),
  limiteFdsMes: z.number().optional(),
  prioridade: z.enum(["baixa", "media", "alta"]).optional(),
  cor: z.string().optional(),
  observacoes: z.string().optional(),
  crmNumber: z.string().optional().nullable(),
  crmState: z.string().max(2).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
});

const scheduleProfileSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(500).optional(),
});

const managedUserRoleSchema = z.enum([
  "admin",
  "coordinator",
  "viewer",
  "user",
]);

const managedUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  role: managedUserRoleSchema,
});

const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(6).max(128),
});

function normalizeDoctorIdentity(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

async function requireDoctorInProfile(profileId: number, doctorId: number) {
  const doctor = await getDoctorById(doctorId, profileId);
  if (!doctor || !doctor.ativo) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Medico nao encontrado" });
  }
  return doctor;
}

async function requireScheduleInProfile(profileId: number, scheduleId: number) {
  const schedule = await getScheduleById(scheduleId, profileId);
  if (!schedule) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Escala nao encontrada" });
  }
  return schedule;
}

const saasAdminRouter = router({
  getStats: staffProcedure.query(async () => {
    return getGlobalStats();
  }),
  getNotificationHealth: staffProcedure.query(async () => {
    return getNotificationHealth();
  }),
  listProfiles: staffProcedure.query(async () => {
    return listAllProfiles();
  }),
  listUsers: staffProcedure.query(async () => {
    return listManagedLocalUsers();
  }),
  manualActivate: staffProcedure
    .input(
      z.object({
        userId: z.number(),
        isPaid: z.boolean(),
        maxProfiles: z.number(),
        role: z.enum(["user", "admin", "coordinator", "viewer", "staff"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateUserSubscription(input.userId, {
        isPaid: input.isPaid,
        maxProfiles: input.maxProfiles,
        role: input.role,
      });
      return { success: true };
    }),
  syncDatabase: staffProcedure.mutation(async () => {
    return await repairDatabaseSchema();
  }),
});

/**
 * Client-side administration for a specific team/hospital
 */
const adminRouter = router({
  listTeamMembers: managerProfileProcedure.query(async ({ ctx }) => {
    return listUsersByProfile(ctx.scheduleProfileId);
  }),
});

const paymentsRouter = router({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["individual", "expansion", "enterprise"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const priceId =
        STRIPE_PRICES[input.plan.toUpperCase() as keyof typeof STRIPE_PRICES];

      if (!priceId || priceId.includes("mock")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Pagamento automático ainda não configurado. Por favor, entre em contato via WhatsApp.",
        });
      }

      const session = await (stripe.checkout.sessions.create as any)({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${ENV.appUrl}/app/upgrade?success=true`,
        cancel_url: `${ENV.appUrl}/app/upgrade?canceled=true`,
        customer_email: ctx.user.email,
        metadata: {
          userId: String(ctx.user.id),
        },
      });

      return { url: session.url };
    }),
});

const swapRequestsRouter = router({
  listForSchedule: profileProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireScheduleInProfile(ctx.scheduleProfileId, input.scheduleId);
      return listSwapRequestsForSchedule(input.scheduleId, ctx.scheduleProfileId);
    }),

  create: profileProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        entryId: z.number(),
        requesterDoctorId: z.number().nullable().optional(),
        targetDoctorId: z.number().nullable().optional(),
        requestType: z.enum(["direct_swap", "open_cover"]).default("direct_swap"),
        reason: z.string().trim().min(3).max(512),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const profileId = ctx.scheduleProfileId;
      await requireScheduleInProfile(profileId, input.scheduleId);

      const entries = await getEntriesForSchedule(input.scheduleId);
      const entry = entries.find((item) => item.id === input.entryId);

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plantao nao encontrado",
        });
      }

      if (input.requesterDoctorId) {
        await requireDoctorInProfile(profileId, input.requesterDoctorId);
      }

      if (input.targetDoctorId) {
        if (input.targetDoctorId === entry.doctorId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "O medico substituto precisa ser diferente do medico atual",
          });
        }
        await requireDoctorInProfile(profileId, input.targetDoctorId);
      }

      if (input.requestType === "direct_swap" && !input.targetDoctorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Escolha um medico substituto para a troca direta",
        });
      }

      const swapRequest = await createSwapRequest({
        profileId,
        scheduleId: input.scheduleId,
        scheduleEntryId: input.entryId,
        requesterUserId: ctx.user.id,
        requesterDoctorId: input.requesterDoctorId ?? null,
        currentDoctorId: entry.doctorId,
        targetDoctorId: input.targetDoctorId ?? null,
        requestType: input.requestType,
        reason: input.reason,
        status: "pending",
      });

      await createAuditLog({
        profileId,
        scheduleId: input.scheduleId,
        userId: ctx.user.id,
        action: "create_swap_request",
        entityType: "swap_request",
        entityId: swapRequest?.id,
        description: `Solicitacao de troca criada para o plantao ${input.entryId}`,
        newValue: {
          requesterDoctorId: input.requesterDoctorId ?? null,
          currentDoctorId: entry.doctorId,
          targetDoctorId: input.targetDoctorId ?? null,
          requestType: input.requestType,
          reason: input.reason,
        },
      });

      await queueDoctorNotifications(
        profileId,
        entry.doctorId,
        "swap_request",
        swapRequest?.id,
        "swap_request_created",
        {
          scheduleEntryId: input.entryId,
          scheduleId: input.scheduleId,
          targetDoctorId: input.targetDoctorId ?? null,
          requestType: input.requestType,
        }
      );

      if (input.targetDoctorId) {
        await queueDoctorNotifications(
          profileId,
          input.targetDoctorId,
          "swap_request",
          swapRequest?.id,
          "swap_request_targeted",
          {
            scheduleEntryId: input.entryId,
            scheduleId: input.scheduleId,
            currentDoctorId: entry.doctorId,
          }
        );
      }

      return { success: true, requestId: swapRequest?.id ?? null };
    }),

  approve: managerProfileProcedure
    .input(
      z.object({
        requestId: z.number(),
        targetDoctorId: z.number().nullable().optional(),
        decisionNote: z.string().trim().max(512).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const profileId = ctx.scheduleProfileId;
      const request = await getSwapRequestById(input.requestId, profileId);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao de troca nao encontrada",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A solicitacao de troca ja foi processada",
        });
      }

      const schedule = await requireScheduleInProfile(profileId, request.scheduleId);
      if (schedule.status === "approved" || schedule.status === "locked") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Nao e possivel alterar uma escala aprovada ou bloqueada",
        });
      }

      const entries = await getEntriesForSchedule(request.scheduleId);
      const entry = entries.find((item) => item.id === request.scheduleEntryId);
      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plantao vinculado a solicitacao nao encontrado",
        });
      }

      const effectiveTargetDoctorId =
        request.targetDoctorId ?? input.targetDoctorId ?? null;

      if (!effectiveTargetDoctorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe o medico substituto para aprovar a troca",
        });
      }

      await requireDoctorInProfile(profileId, effectiveTargetDoctorId);

      await updateEntry(entry.id, {
        doctorId: effectiveTargetDoctorId,
        confirmationStatus: "adjustment_requested",
        isManualOverride: true,
        overrideJustification: `Troca aprovada via solicitacao #${request.id}`,
      });

      await updateSwapRequest(request.id, profileId, {
        status: "approved",
        targetDoctorId: effectiveTargetDoctorId,
        decisionNote: input.decisionNote ?? null,
        reviewedByUserId: ctx.user.id,
        reviewedAt: new Date(),
      });

      await createAuditLog({
        profileId,
        scheduleId: request.scheduleId,
        userId: ctx.user.id,
        action: "approve_swap_request",
        entityType: "swap_request",
        entityId: request.id,
        description: `Solicitacao de troca ${request.id} aprovada`,
        previousValue: {
          doctorId: entry.doctorId,
        },
        newValue: {
          doctorId: effectiveTargetDoctorId,
          decisionNote: input.decisionNote ?? null,
        },
      });

      await queueDoctorNotifications(
        profileId,
        request.currentDoctorId,
        "swap_request",
        request.id,
        "swap_request_approved",
        {
          scheduleEntryId: request.scheduleEntryId,
          replacementDoctorId: effectiveTargetDoctorId,
        }
      );

      await queueDoctorNotifications(
        profileId,
        effectiveTargetDoctorId,
        "swap_request",
        request.id,
        "swap_request_assigned",
        {
          scheduleEntryId: request.scheduleEntryId,
          previousDoctorId: request.currentDoctorId,
        }
      );

      return { success: true };
    }),

  reject: managerProfileProcedure
    .input(
      z.object({
        requestId: z.number(),
        decisionNote: z.string().trim().max(512).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const profileId = ctx.scheduleProfileId;
      const request = await getSwapRequestById(input.requestId, profileId);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao de troca nao encontrada",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A solicitacao de troca ja foi processada",
        });
      }

      await updateSwapRequest(request.id, profileId, {
        status: "rejected",
        decisionNote: input.decisionNote ?? null,
        reviewedByUserId: ctx.user.id,
        reviewedAt: new Date(),
      });

      await createAuditLog({
        profileId,
        scheduleId: request.scheduleId,
        userId: ctx.user.id,
        action: "reject_swap_request",
        entityType: "swap_request",
        entityId: request.id,
        description: `Solicitacao de troca ${request.id} rejeitada`,
        newValue: {
          decisionNote: input.decisionNote ?? null,
        },
      });

      await queueDoctorNotifications(
        profileId,
        request.currentDoctorId,
        "swap_request",
        request.id,
        "swap_request_rejected",
        {
          scheduleEntryId: request.scheduleEntryId,
        }
      );

      return { success: true };
    }),
});

export const appRouter = router({
  admin: adminRouter,
  saasAdmin: saasAdminRouter,
  payments: paymentsRouter,
  swapRequests: swapRequestsRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const normalizedEmail = normalizeEmail(input.email);
        const managedUser = await getManagedLocalUserByEmail(normalizedEmail);

        if (managedUser) {
          if (!managedUser.active) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Este usuario esta desativado",
            });
          }

          if (!verifyLocalPassword(input.password, managedUser.passwordHash)) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Login ou senha invalidos",
            });
          }

          // Check email verification if configured (can be toggled in production)
          // For now, we allow login but maybe show a warning in the frontend
          
          await upsertUser({
            openId: managedUser.openId,
            lastSignedIn: new Date(),
          });

          const token = await sdk.signSession(
            {
              openId: managedUser.openId,
              appId: ENV.localSessionAppId,
              name: managedUser.name || managedUser.email,
            },
            { expiresInMs: ONE_YEAR_MS }
          );

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });

          return {
            success: true,
            user: {
              name: managedUser.name || managedUser.email,
              email: managedUser.email,
              isVerified: managedUser.isEmailVerified,
            },
          } as const;
        }

        // Admin fallback check (legacy or dev)
        const adminEmail = ENV.localLoginUsername.trim().toLowerCase();
        if (
          normalizedEmail !== adminEmail ||
          input.password !== ENV.localLoginPassword
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Login ou senha invalidos",
          });
        }

        const token = await sdk.signSession(
          {
            openId: "__local_dev_admin__",
            appId: ENV.localSessionAppId,
            name: "Administrador",
          },
          { expiresInMs: ONE_YEAR_MS }
        );

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          user: {
            name: "Administrador",
            email: adminEmail,
            isVerified: true,
          },
        } as const;
      }),

    acceptInvite: publicProcedure
      .input(acceptInviteSchema)
      .mutation(async ({ input }) => {
        const record = await verifyAuthToken(input.token, "email_verification");
        if (!record) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Link de convite invalido ou expirado",
          });
        }

        const passwordHash = hashLocalPassword(input.password);
        
        await setEmailVerified(record.userId);
        await updateLocalUserPassword(record.userId, passwordHash);

        return { success: true, message: "Conta ativada com sucesso!" };
      }),

    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(3),
          email: z.string().trim().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const email = normalizeEmail(input.email);
        const passwordHash = hashLocalPassword(input.password);

        try {
          const user = await createManagedLocalUser({
            email,
            name: input.name,
            openId: buildLocalOpenId(email),
            passwordHash: passwordHash,
            role: "coordinator",
            isEmailVerified: true,
          });

          const token = await sdk.signSession(
            {
              openId: user.openId,
              appId: ENV.localSessionAppId,
              name: user.name || user.email,
            },
            { expiresInMs: ONE_YEAR_MS }
          );

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });

          return {
            success: true,
            user: {
              name: user.name,
              email: user.email,
            },
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error ? error.message : "Erro ao criar conta",
          });
        }
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  adminUsers: router({
    list: adminProcedure.query(() => listManagedLocalUsers()),

    invite: adminProcedure
      .input(managedUserSchema)
      .mutation(async ({ input }) => {
        const email = normalizeEmail(input.email);
        
        // Use a random placeholder password since they will set it later
        const placeholderHash = hashLocalPassword(randomBytes(16).toString("hex"));

        const user = await createManagedLocalUser({
          email,
          name: input.name,
          openId: buildLocalOpenId(email),
          passwordHash: placeholderHash,
          role: input.role,
          isEmailVerified: false,
        });

        const token = await createAuthToken({
          userId: user.userId,
          type: "email_verification",
          expiresInMinutes: 7 * 24 * 60, // 7 days
        });

        return {
          success: true,
          inviteToken: token,
          inviteLink: `/invite-accept?token=${token}`,
        };
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteManagedLocalUser(input.userId);
        return { success: true };
      }),

    setActive: adminProcedure
      .input(
        z.object({
          userId: z.number().positive(),
          active: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await setManagedLocalUserActive(input.userId, input.active);
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Falha ao atualizar usuario",
          });
        }
      }),
  }),

  scheduleProfiles: router({
    list: protectedProcedure.query(({ ctx }) =>
      listScheduleProfiles(ctx.user.id, ctx.user.role)
    ),

    create: protectedProcedure
      .input(scheduleProfileSchema)
      .mutation(async ({ input, ctx }) => {
        // Verifica limite de unidades do plano/licença
        const existingProfiles = await listScheduleProfiles(ctx.user.id, ctx.user.role);
        
        // Admins tem cota ilimitada; outros seguem maxProfiles
        if (ctx.user.role !== "admin" && existingProfiles.length >= ctx.user.maxProfiles) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Limite de unidades atingido. Adquira uma nova licença para cadastrar outro hospital.",
          });
        }

        const created = await createScheduleProfile({
          name: input.name.trim(),
          description: input.description?.trim() || null,
        }, ctx.user.id);

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar escala",
          });
        }

        return created;
      }),

    applyOrthopedicsBaseline: managerProfileProcedure.mutation(
      async ({ ctx }) => {
        const report = await applyOrthopedicsBaseline(ctx.scheduleProfileId);

        await createAuditLog({
          profileId: ctx.scheduleProfileId,
          userId: ctx.user?.id,
          action: "apply_orthopedics_baseline",
          description:
            "Base ortopedica de abril/maio 2026 aplicada ao perfil ativo",
        });

        return report;
      }
    ),
  }),

  doctors: router({
    list: profileProcedure.query(({ ctx }) => getAllDoctors(ctx.scheduleProfileId)),

    getById: profileProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input, ctx }) =>
        getDoctorById(input.id, ctx.scheduleProfileId).then((doctor) => doctor ?? null)
      ),

    create: managerProfileProcedure
      .input(doctorSchema)
      .mutation(async ({ input, ctx }) => {
        // Trava para versão de teste: máximo de 5 médicos
        if (!ctx.user.isPaid) {
          const count = (await getAllDoctors(ctx.scheduleProfileId)).length;
          if (count >= 5) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Limite de 5 médicos atingido na versão de teste. Adquira uma licença para cadastrar mais profissionais.",
            });
          }
        }
        await createDoctor({ ...input, profileId: ctx.scheduleProfileId });
        return { success: true };
      }),

    import: managerProfileProcedure
      .input(
        z.object({
          rows: z.array(doctorSchema).min(1).max(500),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existingDoctors = await getAllDoctors(ctx.scheduleProfileId);
        const knownNames = new Set(
          existingDoctors.map((doctor) => normalizeDoctorIdentity(doctor.name))
        );
        const knownShortNames = new Set(
          existingDoctors.map((doctor) =>
            normalizeDoctorIdentity(doctor.shortName)
          )
        );
        const skipped: Array<{
          rowNumber: number;
          name: string;
          reason: string;
        }> = [];
        let created = 0;

        for (let index = 0; index < input.rows.length; index += 1) {
          const row = input.rows[index];
          const normalizedName = normalizeDoctorIdentity(row.name);
          const normalizedShortName = normalizeDoctorIdentity(row.shortName);

          if (knownNames.has(normalizedName)) {
            skipped.push({
              rowNumber: index + 1,
              name: row.name,
              reason: "nome ja cadastrado nesta equipe",
            });
            continue;
          }

          if (knownShortNames.has(normalizedShortName)) {
            skipped.push({
              rowNumber: index + 1,
              name: row.name,
              reason: "nome curto ja cadastrado nesta equipe",
            });
            continue;
          }

          // Trava para versão de teste no import CSV
          if (!ctx.user.isPaid) {
            const currentCount = (await getAllDoctors(ctx.scheduleProfileId)).length;
            if (currentCount + created >= 5) {
              skipped.push({
                rowNumber: index + 1,
                name: row.name,
                reason: "limite de 5 medicos da versao de teste atingido",
              });
              continue;
            }
          }

          await createDoctor({ ...row, profileId: ctx.scheduleProfileId });
          knownNames.add(normalizedName);
          knownShortNames.add(normalizedShortName);
          created += 1;
        }

        if (created > 0) {
          await createAuditLog({
            profileId: ctx.scheduleProfileId,
            userId: ctx.user?.id,
            action: "import_doctors_csv",
            description: `${created} medicos importados via CSV`,
            newValue: {
              created,
              skipped: skipped.length,
            },
          });
        }

        return {
          created,
          skipped,
        };
      }),

    update: managerProfileProcedure
      .input(z.object({ id: z.number(), data: doctorSchema.partial() }))
      .mutation(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.id);
        await updateDoctor(input.id, ctx.scheduleProfileId, input.data);
        return { success: true };
      }),

    delete: managerProfileProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.id);
        await deleteDoctor(input.id, ctx.scheduleProfileId);
        return { success: true };
      }),

    seed: managerProfileProcedure.mutation(async () => {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "O pre-cadastro legado de medicos foi desativado.",
      });
    }),

    getUnavailabilities: profileProcedure
      .input(z.object({ doctorId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.doctorId);
        return getFixedUnavailabilitiesByDoctor(
          input.doctorId,
          ctx.scheduleProfileId
        );
      }),

    addFixedUnavailability: managerProfileProcedure
      .input(
        z.object({
          doctorId: z.number(),
          dayOfWeek: z.number().min(0).max(6),
          shiftType: z.enum([
            "manha_sus",
            "manha_convenio",
            "tarde_sus",
            "tarde_convenio",
            "noite",
            "all_day",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.doctorId);
        await createFixedUnavailability({
          ...input,
          profileId: ctx.scheduleProfileId,
        });
        return { success: true };
      }),

    removeFixedUnavailability: managerProfileProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteFixedUnavailability(input.id, ctx.scheduleProfileId);
        return { success: true };
      }),
  }),

  weeklyRules: router({
    list: profileProcedure.query(({ ctx }) => getAllWeeklyRules(ctx.scheduleProfileId)),

    listByDay: profileProcedure
      .input(z.object({ dayOfWeek: z.number() }))
      .query(async ({ input, ctx }) => {
        const rules = await getAllWeeklyRules(ctx.scheduleProfileId);
        return rules.filter((rule: any) => rule.dayOfWeek === input.dayOfWeek);
      }),

    create: managerProfileProcedure
      .input(
        z.object({
          doctorId: z.number(),
          dayOfWeek: z.number().min(0).max(6),
          shiftType: z.enum([
            "manha_sus",
            "manha_convenio",
            "tarde_sus",
            "tarde_convenio",
            "noite",
          ]),
          weekAlternation: z.enum(["all", "odd", "even"]).default("all"),
          participaRodizioNoite: z.boolean().default(false),
          noiteFixa: z.boolean().default(false),
          priority: z.number().default(0),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.doctorId);
        await createWeeklyRule({ ...input, profileId: ctx.scheduleProfileId });
        return { success: true };
      }),

    update: managerProfileProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            shiftType: z
              .enum([
                "manha_sus",
                "manha_convenio",
                "tarde_sus",
                "tarde_convenio",
                "noite",
              ])
              .optional(),
            weekAlternation: z.enum(["all", "odd", "even"]).optional(),
            participaRodizioNoite: z.boolean().optional(),
            noiteFixa: z.boolean().optional(),
            priority: z.number().optional(),
            observacoes: z.string().optional(),
            ativo: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const rule = await getWeeklyRuleById(input.id, ctx.scheduleProfileId);
        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Regra semanal nao encontrada",
          });
        }
        await updateWeeklyRule(input.id, ctx.scheduleProfileId, input.data);
        return { success: true };
      }),

    delete: managerProfileProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const rule = await getWeeklyRuleById(input.id, ctx.scheduleProfileId);
        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Regra semanal nao encontrada",
          });
        }
        await deleteWeeklyRule(input.id, ctx.scheduleProfileId);
        return { success: true };
      }),
  }),

  weekendRules: router({
    list: profileProcedure.query(({ ctx }) => getAllWeekendRules(ctx.scheduleProfileId)),

    create: managerProfileProcedure
      .input(
        z.object({
          doctorId: z.number(),
          dayType: z.enum(["sabado", "domingo", "ambos"]),
          shiftType: z.enum([
            "manha_sus",
            "manha_convenio",
            "tarde_sus",
            "tarde_convenio",
            "noite",
            "plantao_24h",
          ]),
          weekOfMonth: z.number().min(1).max(5).nullable().optional(),
          priority: z.number().default(0),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.doctorId);
        await createWeekendRule({ ...input, profileId: ctx.scheduleProfileId });
        return { success: true };
      }),

    update: managerProfileProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            dayType: z.enum(["sabado", "domingo", "ambos"]).optional(),
            shiftType: z
              .enum([
                "manha_sus",
                "manha_convenio",
                "tarde_sus",
                "tarde_convenio",
                "noite",
                "plantao_24h",
              ])
              .optional(),
            weekOfMonth: z.number().nullable().optional(),
            priority: z.number().optional(),
            observacoes: z.string().optional(),
            ativo: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const rule = await getWeekendRuleById(input.id, ctx.scheduleProfileId);
        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Regra de fim de semana nao encontrada",
          });
        }
        await updateWeekendRule(input.id, ctx.scheduleProfileId, input.data);
        return { success: true };
      }),

    delete: managerProfileProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const rule = await getWeekendRuleById(input.id, ctx.scheduleProfileId);
        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Regra de fim de semana nao encontrada",
          });
        }
        await deleteWeekendRule(input.id, ctx.scheduleProfileId);
        return { success: true };
      }),
  }),

  exceptions: router({
    list: profileProcedure.query(({ ctx }) => getAllExceptions(ctx.scheduleProfileId)),

    listForMonth: profileProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(({ input, ctx }) =>
        getExceptionsForMonth(ctx.scheduleProfileId, input.year, input.month)
      ),

    create: managerProfileProcedure
      .input(
        z.object({
          doctorId: z.number(),
          exceptionType: z.enum(["block", "force_shift", "replace", "swap"]),
          recurrenceType: z
            .enum(["annual", "monthly", "once", "recurring"])
            .default("once"),
          specificDate: z.string().nullable().optional(),
          month: z.number().nullable().optional(),
          dayOfMonth: z.number().nullable().optional(),
          dayOfWeek: z.number().nullable().optional(),
          weekOfMonth: z.number().nullable().optional(),
          shiftType: z
            .enum([
              "manha_sus",
              "manha_convenio",
              "tarde_sus",
              "tarde_convenio",
              "noite",
              "plantao_24h",
              "all_day",
            ])
            .nullable()
            .optional(),
          replaceDoctorId: z.number().nullable().optional(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.doctorId);
        if (input.replaceDoctorId) {
          await requireDoctorInProfile(ctx.scheduleProfileId, input.replaceDoctorId);
        }

        await createException({
          ...input,
          profileId: ctx.scheduleProfileId,
        } as any);
        return { success: true };
      }),

    update: managerProfileProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            exceptionType: z
              .enum(["block", "force_shift", "replace", "swap"])
              .optional(),
            recurrenceType: z
              .enum(["annual", "monthly", "once", "recurring"])
              .optional(),
            specificDate: z.string().nullable().optional(),
            month: z.number().nullable().optional(),
            dayOfMonth: z.number().nullable().optional(),
            reason: z.string().optional(),
            ativo: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const exception = await getExceptionById(input.id, ctx.scheduleProfileId);
        if (!exception) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Excecao nao encontrada",
          });
        }
        await updateException(input.id, ctx.scheduleProfileId, input.data as any);
        return { success: true };
      }),

    delete: managerProfileProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const exception = await getExceptionById(input.id, ctx.scheduleProfileId);
        if (!exception) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Excecao nao encontrada",
          });
        }
        await deleteException(input.id, ctx.scheduleProfileId);
        return { success: true };
      }),
  }),

  holidays: router({
    list: protectedProcedure.query(() => getAllHolidays()),

    create: managerProcedure
      .input(
        z.object({
          name: z.string().min(1),
          holidayDate: z.string(),
          isNational: z.boolean().default(true),
          recurrenceType: z.enum(["annual", "once"]).default("annual"),
        })
      )
      .mutation(async ({ input }) => {
        await createHoliday(input as any);
        return { success: true };
      }),

    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteHoliday(input.id);
        return { success: true };
      }),
  }),

  unavailabilities: router({
    listForMonth: profileProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(({ input, ctx }) =>
        getDateUnavailabilitiesForMonth(
          ctx.scheduleProfileId,
          input.year,
          input.month
        )
      ),

    create: managerProfileProcedure
      .input(
        z.object({
          doctorId: z.number(),
          unavailableDate: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireDoctorInProfile(ctx.scheduleProfileId, input.doctorId);
        await createDateUnavailability({
          ...input,
          profileId: ctx.scheduleProfileId,
        } as any);
        return { success: true };
      }),

    delete: managerProfileProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteDateUnavailability(input.id, ctx.scheduleProfileId);
        return { success: true };
      }),
  }),

  schedules: router({
    getByMonth: profileProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const schedule = await getScheduleByMonth(
          ctx.scheduleProfileId,
          input.year,
          input.month
        );
        if (!schedule) return null;
        const entries = await getEntriesForSchedule(schedule.id);
        return { ...schedule, entries };
      }),

    generate: managerProfileProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Bloqueio de funcionalidade premium
        if (!ctx.user.isPaid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A geração automática de escala é uma funcionalidade premium. Adquira uma licença para liberar o uso da IA.",
          });
        }
        const profileId = ctx.scheduleProfileId;
        const { year, month } = input;

        const allDoctors = await getAllDoctors(profileId);
        const weeklyRulesData = await getAllWeeklyRules(profileId);
        const weekendRulesData = await getAllWeekendRules(profileId);
        const exceptionsData = await getAllExceptions(profileId);
        const holidaysData = await getHolidaysForMonth(year, month);

        const holidayDates = new Set<string>(
          holidaysData.map((holiday: any) => {
            const rawDate = holiday.holidayDate as unknown as string;
            if (typeof rawDate === "string") return rawDate;
            return new Date(rawDate).toISOString().split("T")[0];
          })
        );

        let existingSchedule = await getScheduleByMonth(profileId, year, month);
        if (existingSchedule && (existingSchedule.status === "approved" || existingSchedule.status === "locked")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Nao e possivel regerar uma escala que ja esta aprovada ou bloqueada",
          });
        }

        const residentIds = allDoctors
          .filter((doctor) => doctor.category === "resident")
          .map((doctor) => doctor.id);

        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevSchedule = await getScheduleByMonth(profileId, prevYear, prevMonth);
        let prevMonthEntries: Array<{ doctorId: number; shiftType: string }> = [];

        if (prevSchedule) {
          const prevEntries = await getEntriesForSchedule(prevSchedule.id);
          prevMonthEntries = prevEntries.map((entry) => ({
            doctorId: entry.doctorId,
            entryDate:
              typeof entry.entryDate === "string"
                ? entry.entryDate
                : new Date(entry.entryDate as unknown as Date)
                    .toISOString()
                    .split("T")[0],
            shiftType: entry.shiftType,
          }));
        }

        const result = generateSchedule(
          year,
          month,
          allDoctors as any,
          weeklyRulesData as any,
          weekendRulesData as any,
          exceptionsData as any,
          holidayDates,
          residentIds,
          prevMonthEntries
        );

        let schedule = await getScheduleByMonth(profileId, year, month);
        if (!schedule) {
          await createSchedule({
            profileId,
            year,
            month,
            status: "draft",
            generatedAt: new Date(),
            balanceScore: result.balanceScore,
          });
          schedule = await getScheduleByMonth(profileId, year, month);
        } else {
          await updateSchedule(schedule.id, profileId, {
            generatedAt: new Date(),
            balanceScore: result.balanceScore,
            status: "draft",
          });
          await deleteEntriesForSchedule(schedule.id);
        }

        if (!schedule) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar escala",
          });
        }

        for (const entry of result.entries) {
          await createEntry({
            scheduleId: schedule.id,
            doctorId: entry.doctorId,
            entryDate: entry.entryDate as unknown as Date,
            shiftType: entry.shiftType,
            isFixed: entry.isFixed,
            conflictWarning: entry.conflictWarning,
          });
        }

        await createAuditLog({
          profileId,
          scheduleId: schedule.id,
          userId: ctx.user?.id,
          action: "generate",
          description: `Escala gerada automaticamente para ${month}/${year}. Score: ${result.balanceScore}`,
        });

        return { ...result, scheduleId: schedule.id };
      }),

    importWorkbook: managerProfileProcedure
      .input(
        z.object({
          entries: z.array(scheduleWorkbookEntrySchema).min(1).max(1000),
          month: z.number().int().min(1).max(12),
          year: z.number().int().min(2000).max(2100),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const profileId = ctx.scheduleProfileId;
        const uniqueDoctorNames = Array.from(
          new Set(input.entries.map(entry => entry.doctorName.trim()))
        );
        const resolvedDoctors = await resolveImportedDoctorLabels(
          profileId,
          uniqueDoctorNames
        );

        if (resolvedDoctors.unresolvedLabels.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Nao foi possivel localizar: ${resolvedDoctors.unresolvedLabels.join(", ")}`,
          });
        }

        const importTag = "[importacao-planilha-escala]";
        const importNote = `${importTag} Escala importada da planilha mensal em ${new Date().toISOString()}`;
        let schedule = await getScheduleByMonth(profileId, input.year, input.month);

        if (schedule && (schedule.status === "approved" || schedule.status === "locked")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Nao e possivel importar dados para uma escala que ja esta aprovada ou bloqueada",
          });
        }

        if (!schedule) {
          await createSchedule({
            profileId,
            year: input.year,
            month: input.month,
            status: "draft",
            generatedAt: new Date(),
            notes: importNote,
          });
          schedule = await getScheduleByMonth(profileId, input.year, input.month);
        } else {
          await updateSchedule(schedule.id, profileId, {
            generatedAt: new Date(),
            notes: importNote,
          });
          await deleteEntriesForSchedule(schedule.id);
        }

        if (!schedule) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao preparar a escala para importacao",
          });
        }

        let importedEntries = 0;
        const seenEntries = new Set<string>();

        for (const entry of input.entries) {
          const doctorId = resolvedDoctors.resolvedDoctorIds.get(entry.doctorName);

          if (!doctorId) {
            continue;
          }

          const dedupeKey = `${entry.entryDate}|${entry.shiftType}|${doctorId}`;
          if (seenEntries.has(dedupeKey)) {
            continue;
          }

          seenEntries.add(dedupeKey);

          await createEntry({
            scheduleId: schedule.id,
            doctorId,
            entryDate: entry.entryDate as unknown as Date,
            shiftType: entry.shiftType,
            isFixed: true,
            isManualOverride: true,
            isLocked: false,
            notes: `${importTag} ${entry.sourceLabel ?? ""}`.trim(),
          });
          importedEntries += 1;
        }

        await createAuditLog({
          profileId,
          scheduleId: schedule.id,
          userId: ctx.user?.id,
          action: "import_schedule_workbook",
          description: `${importedEntries} plantoes importados via planilha para ${input.month}/${input.year}`,
          newValue: {
            createdDoctors: resolvedDoctors.createdDoctors,
            importedEntries,
            month: input.month,
            year: input.year,
          },
        });

        return {
          createdDoctors: resolvedDoctors.createdDoctors,
          importedEntries,
          month: input.month,
          scheduleId: schedule.id,
          success: true,
          year: input.year,
        } as const;
      }),

    addEntry: managerProfileProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          doctorId: z.number(),
          entryDate: z.string(),
          shiftType: shiftTypeEnum,
          confirmationStatus: z.enum(["pending", "confirmed", "adjustment_requested"]).default("pending"),
          notes: z.string().optional(),
          overrideJustification: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const profileId = ctx.scheduleProfileId;
        const doctor = await requireDoctorInProfile(profileId, input.doctorId);
        const schedule = await requireScheduleInProfile(profileId, input.scheduleId);

        if (schedule.status === "approved" || schedule.status === "locked") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Nao e possivel adicionar plantoes a uma escala aprovada ou bloqueada",
          });
        }

        const entries = await getEntriesForSchedule(input.scheduleId);
        const exceptionsData = await getAllExceptions(profileId);
        const generatedEntries = entries.map((entry) => ({
          doctorId: entry.doctorId,
          entryDate:
            typeof entry.entryDate === "string"
              ? entry.entryDate
              : new Date(entry.entryDate as unknown as Date)
                  .toISOString()
                  .split("T")[0],
          shiftType: entry.shiftType,
          isFixed: entry.isFixed,
        }));

        const conflicts = validateEntry(
          input.doctorId,
          input.entryDate,
          input.shiftType,
          generatedEntries,
          doctor as any,
          exceptionsData as any,
          new Set()
        );

        await createEntry({
          scheduleId: input.scheduleId,
          doctorId: input.doctorId,
          entryDate: input.entryDate as unknown as Date,
          shiftType: input.shiftType,
          confirmationStatus: input.confirmationStatus,
          isFixed: false,
          isManualOverride: true,
          conflictWarning:
            conflicts.length > 0
              ? conflicts.map((conflict) => conflict.message).join("; ")
              : undefined,
          overrideJustification: input.overrideJustification,
          notes: input.notes,
        });

        await createAuditLog({
          profileId,
          scheduleId: input.scheduleId,
          userId: ctx.user?.id,
          action: "add_entry",
          description: `Plantao adicionado manualmente: medico ${input.doctorId} em ${input.entryDate} - ${input.shiftType}`,
        });

        return { success: true, conflicts };
      }),

    removeEntry: managerProfileProcedure
      .input(z.object({ entryId: z.number(), scheduleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const schedule = await requireScheduleInProfile(
          ctx.scheduleProfileId,
          input.scheduleId
        );

        if (schedule.status === "approved" || schedule.status === "locked") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Nao e possivel remover plantoes de uma escala aprovada ou bloqueada",
          });
        }

        const entries = await getEntriesForSchedule(schedule.id);
        const entry = entries.find((item) => item.id === input.entryId);

        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plantao nao encontrado",
          });
        }

        await deleteEntry(input.entryId);
        await createAuditLog({
          profileId: ctx.scheduleProfileId,
          scheduleId: input.scheduleId,
          userId: ctx.user?.id,
          action: "remove_entry",
          entityType: "schedule_entry",
          entityId: input.entryId,
          description: "Plantao removido manualmente",
        });
        return { success: true };
      }),

    updateStatus: managerProfileProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          status: z.enum(["draft", "preliminary", "approved", "locked"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireScheduleInProfile(ctx.scheduleProfileId, input.scheduleId);
        await updateSchedule(input.scheduleId, ctx.scheduleProfileId, {
          status: input.status,
        });
        await createAuditLog({
          profileId: ctx.scheduleProfileId,
          scheduleId: input.scheduleId,
          userId: ctx.user?.id,
          action: "update_status",
          description: `Status da escala alterado para: ${input.status}`,
        });
        return { success: true };
      }),

    getAuditLog: managerProfileProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireScheduleInProfile(ctx.scheduleProfileId, input.scheduleId);
        return getAuditLogsForSchedule(input.scheduleId, ctx.scheduleProfileId);
      }),

    validate: profileProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input, ctx }) => {
        const schedule = await requireScheduleInProfile(
          ctx.scheduleProfileId,
          input.scheduleId
        );
        const entries = await getEntriesForSchedule(schedule.id);
        const allDoctors = await getAllDoctors(ctx.scheduleProfileId);
        const exceptionsData = await getAllExceptions(ctx.scheduleProfileId);
        const allConflicts: any[] = [];

        const generatedEntries = entries.map((entry) => ({
          doctorId: entry.doctorId,
          entryDate:
            typeof entry.entryDate === "string"
              ? entry.entryDate
              : new Date(entry.entryDate as unknown as Date)
                  .toISOString()
                  .split("T")[0],
          shiftType: entry.shiftType,
          isFixed: entry.isFixed,
        }));

        for (const entry of generatedEntries) {
          const doctor = allDoctors.find((item) => item.id === entry.doctorId);
          if (!doctor) continue;

          const otherEntries = generatedEntries.filter(
            (candidate) =>
              !(
                candidate.doctorId === entry.doctorId &&
                candidate.entryDate === entry.entryDate &&
                candidate.shiftType === entry.shiftType
              )
          );

          const conflicts = validateEntry(
            entry.doctorId,
            entry.entryDate,
            entry.shiftType as any,
            otherEntries,
            doctor as any,
            exceptionsData as any,
            new Set()
          );
          allConflicts.push(...conflicts);
        }

        return { conflicts: allConflicts, isValid: allConflicts.length === 0 };
      }),

    getStats: profileProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Bloqueio de relatórios/estatísticas para free users
        if (!ctx.user.isPaid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A visualização de estatísticas e relatórios é uma funcionalidade premium.",
          });
        }
        const schedule = await requireScheduleInProfile(
          ctx.scheduleProfileId,
          input.scheduleId
        );
        const entries = await getEntriesForSchedule(schedule.id);
        const allDoctors = await getAllDoctors(ctx.scheduleProfileId);

        return allDoctors.map((doctor) => {
          const doctorEntries = entries.filter(
            (entry) => entry.doctorId === doctor.id
          );
          return {
            doctorId: doctor.id,
            doctorName: doctor.shortName,
            doctorColor: doctor.cor,
            totalShifts: doctorEntries.length,
            totalNights: doctorEntries.filter((entry) => entry.shiftType === "noite")
              .length,
            totalWeekends: doctorEntries.filter((entry) => {
              const date = new Date(entry.entryDate as unknown as Date);
              return date.getDay() === 0 || date.getDay() === 6;
            }).length,
            totalSus: doctorEntries.filter((entry) =>
              (entry.shiftType as string).includes("sus")
            ).length,
            totalConvenio: doctorEntries.filter(
              (entry) =>
                (entry.shiftType as string).includes("convenio") ||
                entry.shiftType === "plantao_24h"
            ).length,
          };
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
