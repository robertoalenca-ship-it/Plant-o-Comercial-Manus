export const APP_HOME_PATH = "/app";

export const appPath = (path = "") => {
  if (!path || path === "/") {
    return APP_HOME_PATH;
  }

  return `${APP_HOME_PATH}${path.startsWith("/") ? path : `/${path}`}`;
};

export const isAppRoute = (path: string) =>
  path === APP_HOME_PATH || path.startsWith(`${APP_HOME_PATH}/`);

export const LEGACY_APP_ROUTE_REDIRECTS: Record<string, string> = Object.freeze({
  "/onboarding": appPath("/onboarding"),
  "/calendar": appPath("/calendar"),
  "/doctors": appPath("/doctors"),
  "/weekly-rules": appPath("/weekly-rules"),
  "/weekend-rules": appPath("/weekend-rules"),
  "/exceptions": appPath("/exceptions"),
  "/reports": appPath("/reports"),
  "/settings": appPath("/settings"),
});
