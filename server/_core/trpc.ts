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

type AuthenticatedContext = TrpcContext & {
  user: User;
};

type ProfileContext = AuthenticatedContext & {
  scheduleProfileId: number;
  profileRole?: "owner" | "admin" | "viewer";
};

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

  const authenticatedCtx: AuthenticatedContext = {
    ...ctx,
    user: ctx.user,
  };

  return next({
    ctx: authenticatedCtx,
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

  let profileRole: "owner" | "admin" | "viewer" | undefined;

  if (ctx.user) {
    const accessInfo = await hasProfileAccess(ctx.user.id, ctx.scheduleProfileId);
    
    // staff and admin are allowed bypass for global management
    if (!accessInfo.hasAccess && !["admin", "staff"].includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Voce não tem permissão para acessar o contexto desta clínica.",
      });
    }

    profileRole = accessInfo.role;
  }

  const profileCtx: ProfileContext = {
    ...ctx,
    user: ctx.user as User,
    scheduleProfileId: ctx.scheduleProfileId,
    profileRole,
  };

  return next({
    ctx: profileCtx,
  });
});

export const profileProcedure = protectedProcedure.use(requireScheduleProfile);

export const managerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !["admin", "coordinator", "staff"].includes(ctx.user.role)) {
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

// managerProfileProcedure allows access if user is a GLOBAL manager
// OR if they have manager permissions (owner/admin) WITHIN that profile.
export const managerProfileProcedure = profileProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    const user = ctx.user;

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const profileCtx: ProfileContext = {
      ...ctx,
      user,
      scheduleProfileId: ctx.scheduleProfileId as number,
      profileRole: ctx.profileRole,
    };

    const isGlobalManager = ["admin", "coordinator", "staff"].includes(user.role);
    const isProfileManager = ["owner", "admin"].includes(ctx.profileRole ?? "");

    if (!isGlobalManager && !isProfileManager) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: profileCtx,
    });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['admin', 'staff'].includes(ctx.user.role)) {
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
