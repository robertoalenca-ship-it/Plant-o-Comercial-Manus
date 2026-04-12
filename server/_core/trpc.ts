import {
  NOT_ADMIN_ERR_MSG,
  SCHEDULE_PROFILE_REQUIRED_ERR_MSG,
  UNAUTHED_ERR_MSG,
} from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { hasProfileAccess } from "../db";
import type { TrpcContext } from "./context";
import type { User } from "../../drizzle/schema";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user as User,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireScheduleProfile = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.scheduleProfileId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: SCHEDULE_PROFILE_REQUIRED_ERR_MSG,
    });
  }

  if (ctx.user) {
    const hasAccess = await hasProfileAccess(ctx.user.id, ctx.scheduleProfileId);
    if (!hasAccess && ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Voce não tem permissão para acessar o contexto desta clínica.",
      });
    }
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user as User,
      scheduleProfileId: ctx.scheduleProfileId as number,
    },
  });
});

export const profileProcedure = protectedProcedure.use(requireScheduleProfile);

export const managerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !["admin", "coordinator"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as User,
      },
    });
  }),
);

export const managerProfileProcedure = managerProcedure.use(
  requireScheduleProfile
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as User,
      },
    });
  }),
);

export const staffProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || !["staff", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acesso restrito à equipe interna.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user as User,
      },
    });
  })
);
