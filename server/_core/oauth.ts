import { randomBytes } from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleAuthType = "signIn" | "signUp";

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getGoogleCallbackUrl(req: Request) {
  return `${req.protocol}://${req.get("host")}/api/oauth/google/callback`;
}

function getCookieValue(req: Request, key: string) {
  const parsedCookies = parseCookieHeader(req.headers.cookie ?? "");
  return parsedCookies[key];
}

function isGoogleAuthConfigured() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

function buildGoogleOpenId(sub: string) {
  return `google:${sub}`;
}

function getSafeAuthType(value: string | undefined): GoogleAuthType {
  return value === "signUp" ? "signUp" : "signIn";
}

async function exchangeGoogleCodeForTokens(req: Request, code: string) {
  const params = new URLSearchParams({
    code,
    client_id: ENV.googleClientId,
    client_secret: ENV.googleClientSecret,
    redirect_uri: getGoogleCallbackUrl(req),
    grant_type: "authorization_code",
  });

  const { data } = await axios.post<{
    access_token: string;
  }>(GOOGLE_TOKEN_URL, params.toString(), {
    family: 4,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data;
}

async function getGoogleUserInfo(accessToken: string) {
  const { data } = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
    family: 4,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

function setGoogleSessionCookie(req: Request, res: Response, sessionToken: string) {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/google/start", async (req: Request, res: Response) => {
    if (!isGoogleAuthConfigured()) {
      res.status(503).json({ error: "Google OAuth is not configured" });
      return;
    }

    const state = randomBytes(24).toString("hex");
    const authType = getSafeAuthType(getQueryParam(req, "type"));
    const cookieOptions = getSessionCookieOptions(req);

    res.cookie(GOOGLE_STATE_COOKIE, state, {
      ...cookieOptions,
      maxAge: GOOGLE_STATE_MAX_AGE_MS,
    });

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", ENV.googleClientId);
    authUrl.searchParams.set("redirect_uri", getGoogleCallbackUrl(req));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    if (authType === "signUp") {
      authUrl.searchParams.set("include_granted_scopes", "true");
    }

    res.redirect(302, authUrl.toString());
  });

  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const expectedState = getCookieValue(req, GOOGLE_STATE_COOKIE);

    res.clearCookie(GOOGLE_STATE_COOKIE, {
      ...getSessionCookieOptions(req),
      maxAge: -1,
    });

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    if (!expectedState || expectedState !== state) {
      res.status(400).json({ error: "Invalid OAuth state" });
      return;
    }

    try {
      const tokenResponse = await exchangeGoogleCodeForTokens(req, code);
      const googleUser = await getGoogleUserInfo(tokenResponse.access_token);

      if (!googleUser.sub) {
        res.status(400).json({ error: "Google user id missing" });
        return;
      }

      const openId = buildGoogleOpenId(googleUser.sub);
      const displayName = googleUser.name || googleUser.email || "Usuario Google";

      await db.upsertUser({
        openId,
        name: googleUser.name ?? null,
        email: googleUser.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const storedUser = await db.getUserByOpenId(openId);
      if (storedUser && googleUser.email_verified) {
        await db.setEmailVerified(storedUser.id);
      }

      const sessionToken = await sdk.signSession(
        {
          openId,
          appId: ENV.googleClientId || ENV.localSessionAppId,
          name: displayName,
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      setGoogleSessionCookie(req, res, sessionToken);
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      res.status(500).json({ error: "Google OAuth callback failed" });
    }
  });
}
