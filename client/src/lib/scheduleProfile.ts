export const ACTIVE_SCHEDULE_PROFILE_KEY = "active-schedule-profile-id";
export const SCHEDULE_PROFILE_CHANGE_EVENT = "schedule-profile-change";

let currentScheduleProfileId: number | null = null;
let hasHydratedScheduleProfileId = false;

function parseScheduleProfileId(rawValue: unknown) {
  const parsedValue = Number.parseInt(`${rawValue ?? ""}`, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function readScheduleProfileIdFromStorage() {
  if (typeof window === "undefined") return null;
  return parseScheduleProfileId(
    window.localStorage.getItem(ACTIVE_SCHEDULE_PROFILE_KEY)
  );
}

function hydrateScheduleProfileId() {
  if (typeof window === "undefined") return null;

  if (!hasHydratedScheduleProfileId) {
    currentScheduleProfileId = readScheduleProfileIdFromStorage();
    hasHydratedScheduleProfileId = true;
  }

  return currentScheduleProfileId;
}

export function getStoredScheduleProfileId() {
  return hydrateScheduleProfileId();
}

export function syncStoredScheduleProfileIdFromStorage() {
  if (typeof window === "undefined") return null;

  currentScheduleProfileId = readScheduleProfileIdFromStorage();
  hasHydratedScheduleProfileId = true;
  return currentScheduleProfileId;
}

export function setStoredScheduleProfileId(profileId: number | null) {
  if (typeof window === "undefined") return;
  const currentProfileId = hydrateScheduleProfileId();
  const nextProfileId = parseScheduleProfileId(profileId);

  if (
    currentProfileId === nextProfileId &&
    readScheduleProfileIdFromStorage() === nextProfileId
  ) {
    return;
  }

  currentScheduleProfileId = nextProfileId;
  hasHydratedScheduleProfileId = true;

  if (nextProfileId) {
    window.localStorage.setItem(
      ACTIVE_SCHEDULE_PROFILE_KEY,
      String(nextProfileId)
    );
  } else {
    window.localStorage.removeItem(ACTIVE_SCHEDULE_PROFILE_KEY);
  }

  window.dispatchEvent(new CustomEvent(SCHEDULE_PROFILE_CHANGE_EVENT));
}

export function clearStoredScheduleProfileId() {
  setStoredScheduleProfileId(null);
}
