import mysql from "mysql2/promise";
import dotenv from "dotenv";
import {
  APRIL_IMPORT_TAG,
  SOURCE_TAG,
  doctorCatalog,
  doctorProfiles,
  holidaysFromSource,
  april2026ManualEntries,
  weeklyRulesFromDoc,
  weekendRulesFromDoc,
  recurringExceptionsFromDoc,
  may2026ExceptionsFromDoc,
  placeholderDoctors,
  sourceMaterialNotes,
} from "./april-may-2026-source.mjs";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nao definido. Configure o banco antes de rodar este sincronizador.");
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bdra?\b/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.split("T")[0];
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

async function queryRows(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

function buildDoctorIndex(doctors) {
  const byNormalized = new Map();

  for (const doctor of doctors) {
    const tokens = dedupeBy(
      [doctor.name, doctor.shortName].map(normalizeName).filter(Boolean),
      (value) => value
    );

    for (const token of tokens) {
      if (!byNormalized.has(token)) byNormalized.set(token, []);
      byNormalized.get(token).push(doctor);
    }
  }

  return byNormalized;
}

function rankDoctorCandidate(doctor, displayName, matchedAlias) {
  const normalizedDisplay = normalizeName(displayName);
  const normalizedName = normalizeName(doctor.name);
  const normalizedShortName = normalizeName(doctor.shortName);
  const normalizedAlias = normalizeName(matchedAlias);

  let score = 0;

  if (normalizedName === normalizedDisplay) score += 100;
  if (normalizedShortName === normalizedDisplay) score += 90;
  if (normalizedName === normalizedAlias) score += 70;
  if (normalizedShortName === normalizedAlias) score += 60;
  if (normalizedDisplay && normalizedName.includes(normalizedDisplay)) score += 15;
  if (normalizedDisplay && normalizedShortName.includes(normalizedDisplay)) score += 10;
  if (normalizedAlias && normalizedName.includes(normalizedAlias)) score += 8;
  if (normalizedAlias && normalizedShortName.includes(normalizedAlias)) score += 6;
  if (doctor.ativo) score += 5;
  score -= String(doctor.name ?? "").length / 100;

  return score;
}

function resolveDoctorFromState(state, doctorKey) {
  if (state.resolvedDoctorIds.has(doctorKey)) {
    return state.resolvedDoctorIds.get(doctorKey);
  }

  const catalogEntry = doctorCatalog[doctorKey];
  if (!catalogEntry) {
    throw new Error(`doctorKey desconhecido: ${doctorKey}`);
  }

  const aliases = dedupeBy(
    [catalogEntry.displayName, ...(catalogEntry.aliases ?? [])].filter(Boolean),
    (value) => normalizeName(value)
  );

  const candidates = new Map();

  for (const alias of aliases) {
    const normalizedAlias = normalizeName(alias);

    for (const doctor of state.doctorIndex.get(normalizedAlias) ?? []) {
      const existing = candidates.get(doctor.id) ?? { doctor, score: -Infinity };
      const score = rankDoctorCandidate(doctor, catalogEntry.displayName, alias);
      if (score > existing.score) {
        candidates.set(doctor.id, { doctor, score });
      }
    }
  }

  if (candidates.size === 0) {
    for (const doctor of state.doctors) {
      for (const alias of aliases) {
        const normalizedAlias = normalizeName(alias);
        const normalizedName = normalizeName(doctor.name);
        const normalizedShortName = normalizeName(doctor.shortName);
        const fuzzyMatch =
          normalizedName.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedName) ||
          normalizedShortName.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedShortName);

        if (!fuzzyMatch) continue;

        const existing = candidates.get(doctor.id) ?? { doctor, score: -Infinity };
        const score = rankDoctorCandidate(doctor, catalogEntry.displayName, alias) - 20;
        if (score > existing.score) {
          candidates.set(doctor.id, { doctor, score });
        }
      }
    }
  }

  const sorted = Array.from(candidates.values()).sort((a, b) => b.score - a.score);
  const winner = sorted[0]?.doctor ?? null;

  if (!winner) return null;

  state.resolvedDoctorIds.set(doctorKey, winner.id);
  return winner.id;
}

async function createPlaceholderDoctor(conn, state, doctorKey) {
  const placeholder = placeholderDoctors[doctorKey];
  const profile = doctorProfiles[doctorKey];
  const catalogEntry = doctorCatalog[doctorKey];

  if (!profile || !catalogEntry) {
    throw new Error(`Medico nao encontrado no banco e sem perfil base configurado: ${doctorKey}`);
  }

  const payload = {
    name: profile.name ?? catalogEntry.displayName,
    shortName: profile.shortName ?? catalogEntry.displayName,
    category: profile.category ?? "sesab",
    hasSus: profile.hasSus ?? false,
    hasConvenio: profile.hasConvenio ?? false,
    canManhaSus: profile.canManhaSus ?? false,
    canManhaConvenio: profile.canManhaConvenio ?? false,
    canTardeSus: profile.canTardeSus ?? false,
    canTardeConvenio: profile.canTardeConvenio ?? false,
    canNoite: profile.canNoite ?? false,
    canFinalDeSemana: profile.canFinalDeSemana ?? false,
    canSabado: profile.canSabado ?? false,
    canDomingo: profile.canDomingo ?? false,
    can24h: profile.can24h ?? false,
    participaRodizioNoite: profile.participaRodizioNoite ?? false,
    limiteplantoesmes: profile.limiteplantoesmes ?? 0,
    limiteNoitesMes: profile.limiteNoitesMes ?? 0,
    limiteFdsMes: profile.limiteFdsMes ?? 0,
    prioridade: profile.prioridade ?? "media",
    cor: profile.cor ?? "#64748B",
    observacoes: `${SOURCE_TAG} ${placeholder?.observacoes ?? "Medico base criado a partir do material de abril/maio 2026."}`,
    ativo: placeholder?.ativo ?? true,
  };

  const [result] = await conn.execute(
    `INSERT INTO doctors (
      name, shortName, category, hasSus, hasConvenio,
      canManhaSus, canManhaConvenio, canTardeSus, canTardeConvenio,
      canNoite, canFinalDeSemana, canSabado, canDomingo, can24h,
      participaRodizioNoite, limiteplantoesmes, limiteNoitesMes, limiteFdsMes,
      prioridade, cor, observacoes, ativo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      payload.shortName,
      payload.category,
      payload.hasSus ? 1 : 0,
      payload.hasConvenio ? 1 : 0,
      payload.canManhaSus ? 1 : 0,
      payload.canManhaConvenio ? 1 : 0,
      payload.canTardeSus ? 1 : 0,
      payload.canTardeConvenio ? 1 : 0,
      payload.canNoite ? 1 : 0,
      payload.canFinalDeSemana ? 1 : 0,
      payload.canSabado ? 1 : 0,
      payload.canDomingo ? 1 : 0,
      payload.can24h ? 1 : 0,
      payload.participaRodizioNoite ? 1 : 0,
      payload.limiteplantoesmes,
      payload.limiteNoitesMes,
      payload.limiteFdsMes,
      payload.prioridade,
      payload.cor,
      payload.observacoes,
      payload.ativo ? 1 : 0,
    ]
  );

  const doctor = {
    id: result.insertId,
    ...payload,
  };

  state.doctors.push(doctor);
  state.doctorIndex = buildDoctorIndex(state.doctors);
  state.resolvedDoctorIds.set(doctorKey, doctor.id);
  state.createdPlaceholders.push({ doctorKey, doctorId: doctor.id, name: doctor.name });

  return doctor.id;
}

async function resolveDoctorId(conn, state, doctorKey) {
  const existingId = resolveDoctorFromState(state, doctorKey);
  if (existingId) return existingId;
  return createPlaceholderDoctor(conn, state, doctorKey);
}

function withSourcePrefix(value) {
  return `${SOURCE_TAG} ${value}`.trim();
}

function getWeeklyRuleKey(rule) {
  return [rule.doctorId, rule.dayOfWeek, rule.shiftType].join("|");
}

function getWeekendRuleKey(rule) {
  return [rule.doctorId, rule.dayType, rule.weekOfMonth ?? "all"].join("|");
}

function getExceptionKey(item) {
  return [
    item.doctorId,
    item.exceptionType,
    item.recurrenceType,
    toDateOnly(item.specificDate) ?? "null",
    item.month ?? "null",
    item.dayOfMonth ?? "null",
    item.dayOfWeek ?? "null",
    item.weekOfMonth ?? "null",
    item.shiftType ?? "null",
  ].join("|");
}

function getHolidayKey(item) {
  const date = toDateOnly(item.holidayDate);
  if (item.recurrenceType === "annual") {
    return [normalizeName(item.name), date.slice(5, 10), item.recurrenceType].join("|");
  }
  return [normalizeName(item.name), date, item.recurrenceType].join("|");
}

async function syncWeeklyRules(conn, desiredRules) {
  const report = { inserted: 0, updated: 0, deactivated: 0 };
  const existingRows = await queryRows(conn, "SELECT * FROM weekly_rules");
  const byKey = new Map();

  for (const row of existingRows) {
    const key = getWeeklyRuleKey(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const matchedIds = new Set();

  for (const rule of desiredRules) {
    const key = getWeeklyRuleKey(rule);
    const candidates = byKey.get(key) ?? [];
    const primary =
      candidates.find((row) => String(row.observacoes ?? "").includes(SOURCE_TAG)) ??
      candidates.find((row) => row.ativo) ??
      candidates[0];

    if (primary) {
      await conn.execute(
        `UPDATE weekly_rules
         SET doctorId = ?, dayOfWeek = ?, shiftType = ?, weekAlternation = ?,
             participaRodizioNoite = ?, noiteFixa = ?, priority = ?, observacoes = ?, ativo = 1
         WHERE id = ?`,
        [
          rule.doctorId,
          rule.dayOfWeek,
          rule.shiftType,
          rule.weekAlternation,
          rule.participaRodizioNoite ? 1 : 0,
          rule.noiteFixa ? 1 : 0,
          rule.priority,
          rule.observacoes,
          primary.id,
        ]
      );
      matchedIds.add(primary.id);
      report.updated += 1;

      for (const extra of candidates) {
        if (extra.id === primary.id || matchedIds.has(extra.id) || !extra.ativo) continue;
        await conn.execute("UPDATE weekly_rules SET ativo = 0 WHERE id = ?", [extra.id]);
        matchedIds.add(extra.id);
        report.deactivated += 1;
      }
      continue;
    }

    await conn.execute(
      `INSERT INTO weekly_rules (
        doctorId, dayOfWeek, shiftType, weekAlternation,
        participaRodizioNoite, noiteFixa, priority, observacoes, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        rule.doctorId,
        rule.dayOfWeek,
        rule.shiftType,
        rule.weekAlternation,
        rule.participaRodizioNoite ? 1 : 0,
        rule.noiteFixa ? 1 : 0,
        rule.priority,
        rule.observacoes,
      ]
    );
    report.inserted += 1;
  }

  const desiredKeys = new Set(desiredRules.map(getWeeklyRuleKey));
  for (const row of existingRows) {
    if (!row.ativo) continue;
    if (!String(row.observacoes ?? "").includes(SOURCE_TAG)) continue;
    if (matchedIds.has(row.id)) continue;
    if (desiredKeys.has(getWeeklyRuleKey(row))) continue;
    await conn.execute("UPDATE weekly_rules SET ativo = 0 WHERE id = ?", [row.id]);
    report.deactivated += 1;
  }

  return report;
}

async function syncWeekendRules(conn, desiredRules) {
  const report = { inserted: 0, updated: 0, deactivated: 0 };
  const existingRows = await queryRows(conn, "SELECT * FROM weekend_rules");
  const byKey = new Map();

  for (const row of existingRows) {
    const key = getWeekendRuleKey(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const matchedIds = new Set();

  for (const rule of desiredRules) {
    const key = getWeekendRuleKey(rule);
    const candidates = byKey.get(key) ?? [];
    const primary =
      candidates.find((row) => String(row.observacoes ?? "").includes(SOURCE_TAG)) ??
      candidates.find((row) => row.ativo) ??
      candidates[0];

    if (primary) {
      await conn.execute(
        `UPDATE weekend_rules
         SET doctorId = ?, dayType = ?, shiftType = ?, weekOfMonth = ?, priority = ?, observacoes = ?, ativo = 1
         WHERE id = ?`,
        [
          rule.doctorId,
          rule.dayType,
          rule.shiftType,
          rule.weekOfMonth,
          rule.priority,
          rule.observacoes,
          primary.id,
        ]
      );
      matchedIds.add(primary.id);
      report.updated += 1;

      for (const extra of candidates) {
        if (extra.id === primary.id || matchedIds.has(extra.id) || !extra.ativo) continue;
        await conn.execute("UPDATE weekend_rules SET ativo = 0 WHERE id = ?", [extra.id]);
        matchedIds.add(extra.id);
        report.deactivated += 1;
      }
      continue;
    }

    await conn.execute(
      `INSERT INTO weekend_rules (
        doctorId, dayType, shiftType, weekOfMonth, priority, observacoes, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [rule.doctorId, rule.dayType, rule.shiftType, rule.weekOfMonth, rule.priority, rule.observacoes]
    );
    report.inserted += 1;
  }

  const desiredKeys = new Set(desiredRules.map(getWeekendRuleKey));
  for (const row of existingRows) {
    if (!row.ativo) continue;
    if (!String(row.observacoes ?? "").includes(SOURCE_TAG)) continue;
    if (matchedIds.has(row.id)) continue;
    if (desiredKeys.has(getWeekendRuleKey(row))) continue;
    await conn.execute("UPDATE weekend_rules SET ativo = 0 WHERE id = ?", [row.id]);
    report.deactivated += 1;
  }

  return report;
}

async function syncExceptions(conn, desiredItems) {
  const report = { inserted: 0, updated: 0, deactivated: 0 };
  const existingRows = await queryRows(conn, "SELECT * FROM monthly_exceptions");
  const byKey = new Map();

  for (const row of existingRows) {
    const key = getExceptionKey(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const matchedIds = new Set();

  for (const item of desiredItems) {
    const key = getExceptionKey(item);
    const candidates = byKey.get(key) ?? [];
    const primary =
      candidates.find((row) => String(row.reason ?? "").includes(SOURCE_TAG)) ??
      candidates.find((row) => row.ativo) ??
      candidates[0];

    if (primary) {
      await conn.execute(
        `UPDATE monthly_exceptions
         SET doctorId = ?, exceptionType = ?, recurrenceType = ?, specificDate = ?, month = ?, dayOfMonth = ?,
             dayOfWeek = ?, weekOfMonth = ?, shiftType = ?, replaceDoctorId = ?, reason = ?, ativo = 1
         WHERE id = ?`,
        [
          item.doctorId,
          item.exceptionType,
          item.recurrenceType,
          toDateOnly(item.specificDate),
          item.month,
          item.dayOfMonth,
          item.dayOfWeek,
          item.weekOfMonth,
          item.shiftType,
          item.replaceDoctorId,
          item.reason,
          primary.id,
        ]
      );
      matchedIds.add(primary.id);
      report.updated += 1;

      for (const extra of candidates) {
        if (extra.id === primary.id || matchedIds.has(extra.id) || !extra.ativo) continue;
        await conn.execute("UPDATE monthly_exceptions SET ativo = 0 WHERE id = ?", [extra.id]);
        matchedIds.add(extra.id);
        report.deactivated += 1;
      }
      continue;
    }

    await conn.execute(
      `INSERT INTO monthly_exceptions (
        doctorId, exceptionType, recurrenceType, specificDate, month, dayOfMonth,
        dayOfWeek, weekOfMonth, shiftType, replaceDoctorId, reason, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        item.doctorId,
        item.exceptionType,
        item.recurrenceType,
        item.specificDate,
        item.month,
        item.dayOfMonth,
        item.dayOfWeek,
        item.weekOfMonth,
        item.shiftType,
        item.replaceDoctorId,
        item.reason,
      ]
    );
    report.inserted += 1;
  }

  const desiredKeys = new Set(desiredItems.map(getExceptionKey));
  for (const row of existingRows) {
    if (!row.ativo) continue;
    if (!String(row.reason ?? "").includes(SOURCE_TAG)) continue;
    if (matchedIds.has(row.id)) continue;
    if (desiredKeys.has(getExceptionKey(row))) continue;
    await conn.execute("UPDATE monthly_exceptions SET ativo = 0 WHERE id = ?", [row.id]);
    report.deactivated += 1;
  }

  return report;
}

async function syncHolidays(conn, desiredItems) {
  const report = { inserted: 0, updated: 0, deletedDuplicates: 0 };
  const existingRows = await queryRows(conn, "SELECT * FROM holidays");
  const byKey = new Map();

  for (const row of existingRows) {
    const key = getHolidayKey(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  for (const item of desiredItems) {
    const key = getHolidayKey(item);
    const candidates = byKey.get(key) ?? [];
    const primary = candidates[0];

    if (primary) {
      await conn.execute(
        "UPDATE holidays SET name = ?, holidayDate = ?, isNational = ?, recurrenceType = ? WHERE id = ?",
        [item.name, item.holidayDate, item.isNational ? 1 : 0, item.recurrenceType, primary.id]
      );
      report.updated += 1;

      for (const extra of candidates.slice(1)) {
        await conn.execute("DELETE FROM holidays WHERE id = ?", [extra.id]);
        report.deletedDuplicates += 1;
      }
      continue;
    }

    await conn.execute(
      "INSERT INTO holidays (name, holidayDate, isNational, recurrenceType) VALUES (?, ?, ?, ?)",
      [item.name, item.holidayDate, item.isNational ? 1 : 0, item.recurrenceType]
    );
    report.inserted += 1;
  }

  return report;
}

async function syncAprilSchedule(conn, state, resolvedDoctorIds) {
  const [existingSchedule] = await queryRows(
    conn,
    "SELECT id FROM schedules WHERE year = 2026 AND month = 4 LIMIT 1"
  );

  let scheduleId = existingSchedule?.id ?? null;
  const notes = [
    `${APRIL_IMPORT_TAG} Escala manual de abril/2026 importada a partir da planilha enviada pelo usuario.`,
    ...sourceMaterialNotes,
  ].join("\n");

  if (!scheduleId) {
    const [result] = await conn.execute(
      "INSERT INTO schedules (year, month, status, generatedAt, approvedAt, notes) VALUES (2026, 4, 'approved', NOW(), NOW(), ?)",
      [notes]
    );
    scheduleId = result.insertId;
  } else {
    await conn.execute(
      "UPDATE schedules SET status = 'approved', generatedAt = NOW(), approvedAt = NOW(), notes = ? WHERE id = ?",
      [notes, scheduleId]
    );
    await conn.execute("DELETE FROM schedule_entries WHERE scheduleId = ?", [scheduleId]);
  }

  let inserted = 0;
  for (const [entryDate, shiftType, doctorKey] of april2026ManualEntries) {
    const doctorId = resolvedDoctorIds.get(doctorKey);
    if (!doctorId) {
      throw new Error(`Sem doctorId resolvido para entrada de abril: ${doctorKey}`);
    }

    await conn.execute(
      `INSERT INTO schedule_entries (
        scheduleId, doctorId, entryDate, shiftType, isFixed, isManualOverride, isLocked, notes
      ) VALUES (?, ?, ?, ?, 1, 1, 0, ?)`,
      [scheduleId, doctorId, entryDate, shiftType, APRIL_IMPORT_TAG]
    );
    inserted += 1;
  }

  state.aprilScheduleId = scheduleId;
  return { scheduleId, inserted };
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    await conn.beginTransaction();

    const doctors = await queryRows(conn, "SELECT * FROM doctors");
    const state = {
      doctors,
      doctorIndex: buildDoctorIndex(doctors),
      resolvedDoctorIds: new Map(),
      createdPlaceholders: [],
      aprilScheduleId: null,
    };

    const sourceDoctorKeys = new Set([
      ...april2026ManualEntries.map(([, , doctorKey]) => doctorKey),
      ...weeklyRulesFromDoc.map((item) => item.doctorKey),
      ...weekendRulesFromDoc.map((item) => item.doctorKey),
      ...recurringExceptionsFromDoc.map((item) => item.doctorKey),
      ...recurringExceptionsFromDoc.map((item) => item.replaceDoctorKey).filter(Boolean),
      ...may2026ExceptionsFromDoc.map((item) => item.doctorKey),
      ...may2026ExceptionsFromDoc.map((item) => item.replaceDoctorKey).filter(Boolean),
    ]);

    for (const doctorKey of sourceDoctorKeys) {
      await resolveDoctorId(conn, state, doctorKey);
    }

    const weeklyRulesPayload = weeklyRulesFromDoc.map((item) => ({
      doctorId: state.resolvedDoctorIds.get(item.doctorKey),
      dayOfWeek: item.dayOfWeek,
      shiftType: item.shiftType,
      weekAlternation: item.weekAlternation,
      participaRodizioNoite: item.participatesNightRotation,
      noiteFixa: item.fixedNight,
      priority: 0,
      observacoes: withSourcePrefix(item.note),
    }));

    const weekendRulesPayload = weekendRulesFromDoc.map((item) => ({
      doctorId: state.resolvedDoctorIds.get(item.doctorKey),
      dayType: item.dayType,
      shiftType: item.shiftType,
      weekOfMonth: item.weekOfMonth,
      priority: 0,
      observacoes: withSourcePrefix(item.note),
    }));

    const exceptionsPayload = [...recurringExceptionsFromDoc, ...may2026ExceptionsFromDoc].map((item) => ({
      doctorId: state.resolvedDoctorIds.get(item.doctorKey),
      exceptionType: item.exceptionType,
      recurrenceType: item.recurrenceType,
      specificDate: item.specificDate,
      month: item.month,
      dayOfMonth: item.dayOfMonth,
      dayOfWeek: item.dayOfWeek,
      weekOfMonth: item.weekOfMonth,
      shiftType: item.shiftType,
      replaceDoctorId: item.replaceDoctorKey ? state.resolvedDoctorIds.get(item.replaceDoctorKey) : null,
      reason: withSourcePrefix(item.reason),
    }));

    const weeklyReport = await syncWeeklyRules(conn, weeklyRulesPayload);
    const weekendReport = await syncWeekendRules(conn, weekendRulesPayload);
    const exceptionReport = await syncExceptions(conn, exceptionsPayload);
    const holidayReport = await syncHolidays(conn, holidaysFromSource);
    const aprilReport = await syncAprilSchedule(conn, state, state.resolvedDoctorIds);

    await conn.commit();

    console.log("Sincronizacao concluida com sucesso.");
    console.log(`  Regras semanais: ${weeklyReport.inserted} inseridas, ${weeklyReport.updated} atualizadas, ${weeklyReport.deactivated} desativadas`);
    console.log(`  Regras de fim de semana: ${weekendReport.inserted} inseridas, ${weekendReport.updated} atualizadas, ${weekendReport.deactivated} desativadas`);
    console.log(`  Excecoes: ${exceptionReport.inserted} inseridas, ${exceptionReport.updated} atualizadas, ${exceptionReport.deactivated} desativadas`);
    console.log(`  Feriados: ${holidayReport.inserted} inseridos, ${holidayReport.updated} atualizados, ${holidayReport.deletedDuplicates} duplicados removidos`);
    console.log(`  Escala de abril/2026: ${aprilReport.inserted} entradas importadas na schedule ${aprilReport.scheduleId}`);

    if (state.createdPlaceholders.length > 0) {
      console.log("  Placeholders criados:");
      for (const item of state.createdPlaceholders) {
        console.log(`    - ${item.name} (doctorId=${item.doctorId}, chave=${item.doctorKey})`);
      }
    }
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

await main();
