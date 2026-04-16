import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { SCHEDULE_PROFILE_HEADER } from "../../shared/const";
import { getManagedLocalUserByOpenId, getUserByOpenId, upsertUser } from "../db";
import { isManagedLocalOpenId } from "../localPasswordAuth";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  scheduleProfileId: number | null;
  profileRole?: "owner" | "admin" | "viewer";
};

const LOCAL_DEV_OPEN_ID = "__local_dev_admin__";
const LOCAL_DEV_DEFAULT_SCHEDULE_PROFILE_ID = 1;

function createLocalDevUser(): User {
  const now = new Date();
  return {
    id: 0,
    openId: LOCAL_DEV_OPEN_ID,
    name: "Administrador",
    email: "admin@local",
    loginMethod: "password",
    role: "admin",
    isEmailVerified: true,
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

async function getLocalDevUser(): Promise<User | null> {
  try {
    await upsertUser({
      openId: LOCAL_DEV_OPEN_ID,
      name: "Administrador",
      email: "admin@local",
      loginMethod: "password",
      role: "admin",
      lastSignedIn: new Date(),
    });

    return (await getUserByOpenId(LOCAL_DEV_OPEN_ID)) ?? createLocalDevUser();
  } catch (error) {
    console.warn(
      "[Auth] Local dev user database sync failed, using in-memory fallback.",
      error
    );
    return createLocalDevUser();
  }
}

function getSessionCookieValue(req: CreateExpressContextOptions["req"]) {
  const parsedCookies = parseCookieHeader(req.headers.cookie ?? "");
  return parsedCookies[COOKIE_NAME];
}

async function getLocalCredentialUser(
  req: CreateExpressContextOptions["req"]
): Promise<User | null> {
  const sessionCookie = getSessionCookieValue(req);
  const session = await sdk.verifySession(sessionCookie);

  if (!session) {
    return null;
  }

  if (session.openId === LOCAL_DEV_OPEN_ID) {
    return getLocalDevUser();
  }

  if (!isManagedLocalOpenId(session.openId)) {
    return null;
  }

  const managedUser = await getManagedLocalUserByOpenId(session.openId);
  if (!managedUser || !managedUser.active) {
    return null;
  }

  const storedUser = await getUserByOpenId(session.openId);
  if (storedUser) {
    return storedUser;
  }

  return {
    id: managedUser.userId,
    openId: managedUser.openId,
    name: managedUser.name,
    email: managedUser.email,
    loginMethod: managedUser.loginMethod,
    role: managedUser.role,
    isEmailVerified: managedUser.isEmailVerified,
    createdAt: managedUser.createdAt,
    updatedAt: managedUser.updatedAt,
    lastSignedIn: managedUser.lastSignedIn,
    maxProfiles: managedUser.maxProfiles,
    isPaid: managedUser.isPaid,
    stripeCustomerId: managedUser.stripeCustomerId,
    stripeSubscriptionId: managedUser.stripeSubscriptionId,
    subscriptionStatus: managedUser.subscriptionStatus,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  console.log(`[Context V2] Starting for ${opts.req.method} ${opts.req.url}`);
  const rawProfileHeader = opts.req.headers[SCHEDULE_PROFILE_HEADER];
  const scheduleProfileIdValue = Array.isArray(rawProfileHeader)
    ? rawProfileHeader[0]
    : rawProfileHeader;
  const parsedScheduleProfileId = Number.parseInt(
    `${scheduleProfileIdValue ?? ""}`,
    10
  );
  const scheduleProfileId =
    Number.isFinite(parsedScheduleProfileId) && parsedScheduleProfileId > 0
      ? parsedScheduleProfileId
      : null;

  console.log(`[Context] Checking local credentials...`);
  const localCredentialUser = await getLocalCredentialUser(opts.req);

  if (localCredentialUser) {
    console.log(`[Context] Local user found: ${localCredentialUser.email}`);
    return {
      req: opts.req,
      res: opts.res,
      user: localCredentialUser,
      scheduleProfileId:
        scheduleProfileId ?? LOCAL_DEV_DEFAULT_SCHEDULE_PROFILE_ID,
    };
  }

  console.log(`[Context] No local user. Checking OAuth...`);
  if (!ENV.oAuthServerUrl && !ENV.isProduction) {
    console.log(`[Context] Development mode, no OAuth server URL. Returning null user.`);
    return {
      req: opts.req,
      res: opts.res,
      user: null,
      scheduleProfileId:
        scheduleProfileId ?? LOCAL_DEV_DEFAULT_SCHEDULE_PROFILE_ID,
    };
  }

  try {
    console.log(`[Context] Authenticating via SDK...`);
    user = await sdk.authenticateRequest(opts.req);
    console.log(`[Context] Auth success: ${user?.email}`);
  } catch (error) {
    console.log(`[Context] Auth skipped/failed: ${error instanceof Error ? error.message : String(error)}`);
    // Authentication is optional for public procedures.
    user = null;
  }

  console.log(`[Context] Done.`);
  return {
    req: opts.req,
    res: opts.res,
    user,
    scheduleProfileId,
  };
}
