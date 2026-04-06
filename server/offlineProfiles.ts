import {
  getOfflineDoctorById as getOfflineOrthopedicsDoctorById,
  getOfflineEntriesForSchedule as getOfflineOrthopedicsEntriesForSchedule,
  getOfflineExceptionsForMonth as getOfflineOrthopedicsExceptionsForMonth,
  getOfflineHolidaysForMonth as getOfflineOrthopedicsHolidaysForMonth,
  getOfflineScheduleById as getOfflineOrthopedicsScheduleById,
  getOfflineScheduleByMonth as getOfflineOrthopedicsScheduleByMonth,
  matchesOfflineProfile as isOfflineOrthopedicsProfile,
  offlineAprilEntries as offlineOrthopedicsAprilEntries,
  offlineDoctors as offlineOrthopedicsDoctors,
  offlineExceptions as offlineOrthopedicsExceptions,
  offlineHolidays as offlineOrthopedicsHolidays,
  offlineScheduleProfile as offlineOrthopedicsScheduleProfile,
  offlineWeeklyRules as offlineOrthopedicsWeeklyRules,
  offlineWeekendRules as offlineOrthopedicsWeekendRules,
} from "./offlineOrthopedics";

export function listOfflineScheduleProfiles() {
  return [offlineOrthopedicsScheduleProfile];
}

export function getOfflineScheduleProfileById(profileId: number) {
  if (isOfflineOrthopedicsProfile(profileId)) return offlineOrthopedicsScheduleProfile;
  return undefined;
}

export function isOfflineProfile(profileId: number) {
  return isOfflineOrthopedicsProfile(profileId);
}

export function getOfflineDoctors(profileId: number) {
  if (isOfflineOrthopedicsProfile(profileId)) {
    return offlineOrthopedicsDoctors.filter((doctor) => doctor.ativo);
  }

  return [];
}

export function getOfflineDoctorById(profileId: number, doctorId: number) {
  if (isOfflineOrthopedicsProfile(profileId)) {
    return getOfflineOrthopedicsDoctorById(doctorId);
  }

  return undefined;
}

export function getOfflineWeeklyRules(profileId: number) {
  return isOfflineOrthopedicsProfile(profileId)
    ? offlineOrthopedicsWeeklyRules.filter((rule) => rule.ativo)
    : [];
}

export function getOfflineWeeklyRuleById(profileId: number, id: number) {
  return getOfflineWeeklyRules(profileId).find((rule) => rule.id === id);
}

export function getOfflineWeekendRules(profileId: number) {
  return isOfflineOrthopedicsProfile(profileId)
    ? offlineOrthopedicsWeekendRules.filter((rule) => rule.ativo)
    : [];
}

export function getOfflineWeekendRuleById(profileId: number, id: number) {
  return getOfflineWeekendRules(profileId).find((rule) => rule.id === id);
}

export function getOfflineExceptions(profileId: number) {
  return isOfflineOrthopedicsProfile(profileId)
    ? offlineOrthopedicsExceptions.filter((exception) => exception.ativo)
    : [];
}

export function getOfflineExceptionById(profileId: number, id: number) {
  return getOfflineExceptions(profileId).find((exception) => exception.id === id);
}

export function getOfflineExceptionsForMonth(
  profileId: number,
  year: number,
  month: number
) {
  return isOfflineOrthopedicsProfile(profileId)
    ? getOfflineOrthopedicsExceptionsForMonth(year, month)
    : [];
}

export function getOfflineHolidays() {
  return offlineOrthopedicsHolidays;
}

export function getOfflineHolidaysForMonth(year: number, month: number) {
  return getOfflineOrthopedicsHolidaysForMonth(year, month);
}

export function getOfflineScheduleByMonth(
  profileId: number,
  year: number,
  month: number
) {
  if (isOfflineOrthopedicsProfile(profileId)) {
    return getOfflineOrthopedicsScheduleByMonth(year, month);
  }

  return undefined;
}

export function getOfflineScheduleById(profileId: number, id: number) {
  if (isOfflineOrthopedicsProfile(profileId)) {
    return getOfflineOrthopedicsScheduleById(id);
  }

  return undefined;
}

export function getOfflineEntriesForSchedule(profileId: number, scheduleId: number) {
  if (isOfflineOrthopedicsProfile(profileId)) {
    return scheduleId === getOfflineOrthopedicsScheduleByMonth(2026, 4)?.id
      ? offlineOrthopedicsAprilEntries
      : getOfflineOrthopedicsEntriesForSchedule(scheduleId);
  }

  return [];
}

export function getOfflineValidationForSchedule(
  _profileId: number,
  _scheduleId: number
) {
  return [];
}

export function getOfflineStatsForSchedule(
  _profileId: number,
  _scheduleId: number
) {
  return [];
}
