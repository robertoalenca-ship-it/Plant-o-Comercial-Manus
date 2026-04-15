export const APP_HOME_PATH = "/app";
export const STAFF_HOME_PATH = "/staff";
export const STAFF_SUPPORT_HOME_PATH = "/staff/support";

export const appPath = (path = "") => {
  if (!path || path === "/") {
    return APP_HOME_PATH;
  }

  return `${APP_HOME_PATH}${path.startsWith("/") ? path : `/${path}`}`;
};

export const staffPath = (path = "") => {
  if (!path || path === "/") {
    return STAFF_HOME_PATH;
  }

  return `${STAFF_HOME_PATH}${path.startsWith("/") ? path : `/${path}`}`;
};

export const supportPath = (path = "") => {
  if (!path || path === "/") {
    return STAFF_SUPPORT_HOME_PATH;
  }

  return `${STAFF_SUPPORT_HOME_PATH}${path.startsWith("/") ? path : `/${path}`}`;
};

export const isAppRoute = (path: string) =>
  path === APP_HOME_PATH || path.startsWith(`${APP_HOME_PATH}/`);

export const isStaffRoute = (path: string) =>
  path === STAFF_HOME_PATH ||
  (path.startsWith(`${STAFF_HOME_PATH}/`) &&
    !path.startsWith(`${STAFF_SUPPORT_HOME_PATH}/`));

export const isSupportRoute = (path: string) =>
  path === STAFF_SUPPORT_HOME_PATH || path.startsWith(`${STAFF_SUPPORT_HOME_PATH}/`);

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
