import { pingDatabase } from "../db";
import { ENV } from "./env";

type ReadinessCheck = {
  name: string;
  ok: boolean;
  details?: string;
};

const BASE_REQUIRED_ENV_VARS = ["DATABASE_URL", "JWT_SECRET"] as const;
const GOOGLE_AUTH_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isWeakJwtSecret(secret: string | undefined): boolean {
  if (!hasValue(secret)) return true;
  return secret === "troque-esta-chave" || secret.trim().length < 16;
}

export async function getReadinessReport() {
  const configuredGoogleAuthEnvVars = GOOGLE_AUTH_ENV_VARS.filter((key) =>
    hasValue(process.env[key])
  );
  const isGoogleAuthFullyConfigured =
    configuredGoogleAuthEnvVars.length === GOOGLE_AUTH_ENV_VARS.length;
  const hasPartialGoogleAuthConfig =
    configuredGoogleAuthEnvVars.length > 0 && !isGoogleAuthFullyConfigured;
  const requiredEnvVars = hasPartialGoogleAuthConfig
    ? [...BASE_REQUIRED_ENV_VARS, ...GOOGLE_AUTH_ENV_VARS]
    : [...BASE_REQUIRED_ENV_VARS];

  const missingEnvVars = requiredEnvVars.filter((key) => !hasValue(process.env[key]));
  const checks: ReadinessCheck[] = [];

  checks.push({
    name: "env.required",
    ok: missingEnvVars.length === 0,
    details:
      missingEnvVars.length > 0
        ? `Missing: ${missingEnvVars.join(", ")}`
        : "Required environment variables are configured",
  });

  checks.push({
    name: "env.jwt_secret",
    ok: !isWeakJwtSecret(process.env.JWT_SECRET),
    details: isWeakJwtSecret(process.env.JWT_SECRET)
      ? "JWT_SECRET is missing or too weak"
      : "JWT secret looks configured",
  });

  checks.push({
    name: "auth.configuration",
    ok: !hasPartialGoogleAuthConfig,
    details: hasPartialGoogleAuthConfig
      ? `Google OAuth parcialmente configurado. Complete: ${GOOGLE_AUTH_ENV_VARS.filter((key) => !hasValue(process.env[key])).join(", ")}`
      : isGoogleAuthFullyConfigured
        ? "Autenticacao Google configurada"
        : "Autenticacao local configurada",
  });

  const databaseReachable = await pingDatabase();
  checks.push({
    name: "database.connection",
    ok: databaseReachable,
    details: databaseReachable ? "Database responded successfully" : "Failed to connect to database",
  });

  return {
    ok: checks.every((check) => check.ok),
    environment: ENV.isProduction ? "production" : "development",
    authMode: isGoogleAuthFullyConfigured
      ? "google"
      : ENV.isProduction
        ? "local-password"
        : "local-dev",
    checks,
    timestamp: new Date().toISOString(),
  };
}
