export const STAFF_SUPPORT_MODE_KEY = "staff-support-mode";
export const STAFF_SUPPORT_PROFILE_KEY = "staff-support-profile-id";
export const STAFF_SUPPORT_CHANGE_EVENT = "staff-support-change";

function dispatchSupportAccessChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STAFF_SUPPORT_CHANGE_EVENT));
}

export function isSupportModeEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STAFF_SUPPORT_MODE_KEY) === "true";
}

export function getSupportModeProfileId() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STAFF_SUPPORT_PROFILE_KEY);
  const parsed = Number.parseInt(`${raw ?? ""}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function enableSupportMode(profileId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STAFF_SUPPORT_MODE_KEY, "true");
  window.localStorage.setItem(STAFF_SUPPORT_PROFILE_KEY, String(profileId));
  dispatchSupportAccessChange();
}

export function disableSupportMode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STAFF_SUPPORT_MODE_KEY);
  window.localStorage.removeItem(STAFF_SUPPORT_PROFILE_KEY);
  dispatchSupportAccessChange();
}
