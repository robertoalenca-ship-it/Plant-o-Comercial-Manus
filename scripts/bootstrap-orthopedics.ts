import mysql from "mysql2/promise";
import {
  offlineAprilEntries,
  offlineAprilSchedule,
  offlineDoctors,
  offlineExceptions,
  offlineHolidays,
  offlineScheduleProfile,
  offlineWeeklyRules,
  offlineWeekendRules,
} from "../server/offlineOrthopedics";

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function ensureDatabaseUrl() {
  if (hasValue(process.env.DATABASE_URL)) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.MYSQL_HOST ?? "mysql";
  const port = process.env.MYSQL_PORT ?? "3306";
  const database = process.env.MYSQL_DATABASE;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;

  if (![database, user, password].every(hasValue)) {
    throw new Error(
      "Defina DATABASE_URL ou informe MYSQL_DATABASE, MYSQL_USER e MYSQL_PASSWORD."
    );
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

const connection = await mysql.createConnection(ensureDatabaseUrl());

try {
  const [[counts]] = await connection.query<mysql.RowDataPacket[]>(
    `
      SELECT
        (SELECT COUNT(*) FROM doctors) AS doctorsCount,
        (SELECT COUNT(*) FROM weekly_rules) AS weeklyRulesCount,
        (SELECT COUNT(*) FROM weekend_rules) AS weekendRulesCount,
        (SELECT COUNT(*) FROM monthly_exceptions) AS exceptionsCount,
        (SELECT COUNT(*) FROM schedules) AS schedulesCount,
        (SELECT COUNT(*) FROM schedule_entries) AS entriesCount
    `
  );

  const hasOperationalData =
    Number(counts.doctorsCount ?? 0) > 0 ||
    Number(counts.weeklyRulesCount ?? 0) > 0 ||
    Number(counts.weekendRulesCount ?? 0) > 0 ||
    Number(counts.exceptionsCount ?? 0) > 0 ||
    Number(counts.schedulesCount ?? 0) > 0 ||
    Number(counts.entriesCount ?? 0) > 0;

  const [profiles] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT id FROM schedule_profiles WHERE name = ? LIMIT 1",
    [offlineScheduleProfile.name]
  );

  const existingProfileId = Number(profiles[0]?.id ?? 0);

  if (hasOperationalData) {
    console.log("[bootstrap] Banco ja possui dados operacionais. Seed inicial ignorado.");
    process.exit(0);
  }

  await connection.beginTransaction();

  let profileId = existingProfileId;

  if (!profileId) {
    const [insertProfileResult] = await connection.execute<mysql.ResultSetHeader>(
      `
        INSERT INTO schedule_profiles (name, description, active)
        VALUES (?, ?, ?)
      `,
      [
        offlineScheduleProfile.name,
        offlineScheduleProfile.description,
        offlineScheduleProfile.active ? 1 : 0,
      ]
    );
    profileId = Number(insertProfileResult.insertId);
  }

  const doctorIdMap = new Map<number, number>();

  for (const doctor of offlineDoctors) {
    const [doctorResult] = await connection.execute<mysql.ResultSetHeader>(
      `
        INSERT INTO doctors (
          profileId, name, shortName, category,
          hasSus, hasConvenio,
          canManhaSus, canManhaConvenio, canTardeSus, canTardeConvenio,
          canNoite, canFinalDeSemana, canSabado, canDomingo, can24h,
          participaRodizioNoite,
          limiteplantoesmes, limiteNoitesMes, limiteFdsMes,
          prioridade, cor, observacoes, ativo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profileId,
        doctor.name,
        doctor.shortName,
        doctor.category,
        doctor.hasSus ? 1 : 0,
        doctor.hasConvenio ? 1 : 0,
        doctor.canManhaSus ? 1 : 0,
        doctor.canManhaConvenio ? 1 : 0,
        doctor.canTardeSus ? 1 : 0,
        doctor.canTardeConvenio ? 1 : 0,
        doctor.canNoite ? 1 : 0,
        doctor.canFinalDeSemana ? 1 : 0,
        doctor.canSabado ? 1 : 0,
        doctor.canDomingo ? 1 : 0,
        doctor.can24h ? 1 : 0,
        doctor.participaRodizioNoite ? 1 : 0,
        doctor.limiteplantoesmes ?? 0,
        doctor.limiteNoitesMes ?? 0,
        doctor.limiteFdsMes ?? 0,
        doctor.prioridade,
        doctor.cor,
        doctor.observacoes ?? "",
        doctor.ativo ? 1 : 0,
      ]
    );

    doctorIdMap.set(doctor.id, Number(doctorResult.insertId));
  }

  for (const rule of offlineWeeklyRules) {
    await connection.execute(
      `
        INSERT INTO weekly_rules (
          profileId, doctorId, dayOfWeek, shiftType, weekAlternation,
          participaRodizioNoite, noiteFixa, priority, observacoes, ativo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profileId,
        doctorIdMap.get(rule.doctorId),
        rule.dayOfWeek,
        rule.shiftType,
        rule.weekAlternation,
        rule.participaRodizioNoite ? 1 : 0,
        rule.noiteFixa ? 1 : 0,
        rule.priority ?? 0,
        rule.observacoes ?? "",
        rule.ativo ? 1 : 0,
      ]
    );
  }

  for (const rule of offlineWeekendRules) {
    await connection.execute(
      `
        INSERT INTO weekend_rules (
          profileId, doctorId, dayType, shiftType, weekOfMonth,
          priority, observacoes, ativo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profileId,
        doctorIdMap.get(rule.doctorId),
        rule.dayType,
        rule.shiftType,
        rule.weekOfMonth,
        rule.priority ?? 0,
        rule.observacoes ?? "",
        rule.ativo ? 1 : 0,
      ]
    );
  }

  for (const exception of offlineExceptions) {
    await connection.execute(
      `
        INSERT INTO monthly_exceptions (
          profileId, doctorId, exceptionType, recurrenceType, specificDate,
          month, dayOfMonth, dayOfWeek, weekOfMonth, shiftType,
          replaceDoctorId, reason, ativo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profileId,
        doctorIdMap.get(exception.doctorId),
        exception.exceptionType,
        exception.recurrenceType,
        exception.specificDate
          ? new Date(String(exception.specificDate))
          : null,
        exception.month,
        exception.dayOfMonth,
        exception.dayOfWeek,
        exception.weekOfMonth,
        exception.shiftType,
        exception.replaceDoctorId
          ? doctorIdMap.get(exception.replaceDoctorId) ?? null
          : null,
        exception.reason ?? "",
        exception.ativo ? 1 : 0,
      ]
    );
  }

  for (const holiday of offlineHolidays) {
    await connection.execute(
      `
        INSERT INTO holidays (name, holidayDate, isNational, recurrenceType)
        VALUES (?, ?, ?, ?)
      `,
      [
        holiday.name,
        holiday.holidayDate,
        holiday.isNational ? 1 : 0,
        holiday.recurrenceType,
      ]
    );
  }

  const [scheduleResult] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT INTO schedules (
        profileId, year, month, status, generatedAt, approvedAt,
        approvedBy, balanceScore, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      profileId,
      offlineAprilSchedule.year,
      offlineAprilSchedule.month,
      offlineAprilSchedule.status,
      offlineAprilSchedule.generatedAt,
      offlineAprilSchedule.approvedAt,
      offlineAprilSchedule.approvedBy,
      offlineAprilSchedule.balanceScore,
      offlineAprilSchedule.notes ?? "",
    ]
  );

  const scheduleId = Number(scheduleResult.insertId);

  for (const entry of offlineAprilEntries) {
    await connection.execute(
      `
        INSERT INTO schedule_entries (
          scheduleId, doctorId, entryDate, shiftType,
          isFixed, isManualOverride, isLocked,
          conflictWarning, overrideJustification, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        scheduleId,
        doctorIdMap.get(entry.doctorId),
        entry.entryDate,
        entry.shiftType,
        entry.isFixed ? 1 : 0,
        entry.isManualOverride ? 1 : 0,
        entry.isLocked ? 1 : 0,
        entry.conflictWarning,
        entry.overrideJustification,
        entry.notes,
      ]
    );
  }

  await connection.commit();
  console.log(
    `[bootstrap] Ortopedia inicial carregada com sucesso: ${offlineDoctors.length} medicos e ${offlineAprilEntries.length} lancamentos de abril/2026.`
  );
} catch (error) {
  await connection.rollback().catch(() => undefined);
  throw error;
} finally {
  await connection.end();
}
