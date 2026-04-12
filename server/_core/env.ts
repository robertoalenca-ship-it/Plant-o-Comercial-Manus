export const ENV = {
  appUrl: process.env.APP_URL ?? "",
  appId:
    process.env.VITE_APP_ID ??
    process.env.GOOGLE_CLIENT_ID ??
    process.env.LOCAL_SESSION_APP_ID ??
    "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  localLoginUsername: process.env.LOCAL_LOGIN_USERNAME ?? "admin",
  localLoginPassword: process.env.LOCAL_LOGIN_PASSWORD ?? "sonhen",
  localSessionAppId: process.env.LOCAL_SESSION_APP_ID ?? "local-auth",
  enableLegacyOfflineSeed:
    process.env.ENABLE_LEGACY_OFFLINE_SAMPLE === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true",
  isProduction: process.env.NODE_ENV === "production",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceIdIndividual: process.env.STRIPE_PRICE_ID_INDIVIDUAL ?? "",
  stripePriceIdExpansion: process.env.STRIPE_PRICE_ID_EXPANSION ?? "",
  stripePriceIdEnterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
