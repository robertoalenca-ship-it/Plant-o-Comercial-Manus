export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const getLoginUrl = (options: { type?: "signIn" | "signUp" } = {}) => {
  const { type = "signIn" } = options;
  const url = new URL("/api/oauth/google/start", window.location.origin);
  url.searchParams.set("type", type);
  return url.toString();
};

export const isOAuthConfigured = () => true;

export const getSalesContactUrl = () =>
  import.meta.env.VITE_SALES_CONTACT_URL?.trim() || null;
