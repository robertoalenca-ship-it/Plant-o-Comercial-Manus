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
} from "./_core/trpc";
import {
  createAuditLog,
  createDateUnavailability,
  createDoctor,
  createManagedLocalUser,
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
  getHolidaysForMonth,
  getManagedLocalUserByUsername,
  getScheduleById,
  getScheduleByMonth,
  getWeekendRuleById,
  getWeeklyRuleById,
  listManagedLocalUsers,
  listScheduleProfiles,
  setManagedLocalUserActive,
  upsertUser,
  updateDoctor,
  updateException,
  updateSchedule,
  updateWeekendRule,
  updateWeeklyRule,
} from "./db";
import { applyOrthopedicsBaseline } from "./referenceBaseline";
import {
  buildLocalOpenId,
  hashLocalPassword,
  normalizeLocalUsername,
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

const doctorSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
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
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  username: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Use apenas letras, numeros, ponto, traco ou underscore"
    ),
  password: z.string().min(6).max(128),
  role: managedUserRoleSchema,
});

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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    localLogin: publicProcedure
      .input(
        z.object({
          username: z.string().trim().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const normalizedUsername = normalizeLocalUsername(input.username);
        const managedUser = await getManagedLocalUserByUsername(normalizedUsername);

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

          await upsertUser({
            openId: managedUser.openId,
            lastSignedIn: new Date(),
          });

          const token = await sdk.signSession(
            {
              openId: managedUser.openId,
              appId: ENV.localSessionAppId,
              name: managedUser.name || managedUser.username,
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
              name: managedUser.name || managedUser.username,
              email: managedUser.email || `${managedUser.username}@local`,
            },
          } as const;
        }

        if (
          normalizedUsername !== normalizeLocalUsername(ENV.localLoginUsername) ||
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
            email: "admin@local",
          },
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  adminUsers: router({
    list: adminProcedure.query(() => listManagedLocalUsers()),

    create: adminProcedure
      .input(managedUserSchema)
      .mutation(async ({ input }) => {
        const username = normalizeLocalUsername(input.username);
        try {
          const created = await createManagedLocalUser({
            name: input.name.trim(),
            email: input.email?.trim() || null,
            openId: buildLocalOpenId(username),
            passwordHash: hashLocalPassword(input.password),
            role: input.role,
            username,
          });

          return created;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error ? error.message : "Falha ao criar usuario",
          });
        }
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

    delete: adminProcedure
      .input(
        z.object({
          userId: z.number().int().min(0),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await deleteManagedLocalUser(input.userId);
          return { success: true } as const;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error ? error.message : "Falha ao excluir usuario",
          });
        }
      }),
  }),

  scheduleProfiles: router({
    list: protectedProcedure.query(({ ctx }) => listScheduleProfiles(ctx.user?.id)),

    create: protectedProcedure
      .input(scheduleProfileSchema)
      .mutation(async ({ input, ctx }) => {
        const created = await createScheduleProfile({
          name: input.name.trim(),
          description: input.description?.trim() || null,
        }, ctx.user?.id);

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
        await createDoctor({ ...input, profileId: ctx.scheduleProfileId });
        return { success: true };
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

    seed: managerProfileProcedure.mutation(async ({ ctx }) => {
      const existing = await getAllDoctors(ctx.scheduleProfileId);
      if (existing.length > 0) {
        return { message: "Medicos ja cadastrados", count: existing.length };
      }

      for (const doctor of INITIAL_DOCTORS) {
        await createDoctor({ ...doctor, profileId: ctx.scheduleProfileId });
      }

      return {
        message: "Medicos pre-cadastrados com sucesso",
        count: INITIAL_DOCTORS.length,
      };
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

    addEntry: managerProfileProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          doctorId: z.number(),
          entryDate: z.string(),
          shiftType: shiftTypeEnum,
          notes: z.string().optional(),
          overrideJustification: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const profileId = ctx.scheduleProfileId;
        const doctor = await requireDoctorInProfile(profileId, input.doctorId);
        await requireScheduleInProfile(profileId, input.scheduleId);

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
