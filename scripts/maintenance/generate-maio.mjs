/**
 * Gera a escala de maio 2026 diretamente via algoritmo,
 * usando a carga de abril como base para balancear rodízio.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── Buscar dados do banco ──────────────────────────────────────────────────
const [doctors] = await conn.execute("SELECT * FROM doctors");
const [weeklyRules] = await conn.execute("SELECT * FROM weekly_rules");
const [weekendRules] = await conn.execute("SELECT * FROM weekend_rules");
const [exceptions] = await conn.execute("SELECT * FROM monthly_exceptions");
const [holidays] = await conn.execute(
  "SELECT * FROM holidays WHERE (MONTH(holidayDate) = 5 AND YEAR(holidayDate) = 2026) OR (recurrenceType = 'annual' AND MONTH(holidayDate) = 5)"
);

// Buscar entradas de abril para balancear
const [aprilSched] = await conn.execute(
  "SELECT id FROM schedules WHERE year = 2026 AND month = 4 LIMIT 1"
);
let prevMonthEntries = [];
if (aprilSched.length > 0) {
  const [aprilEntries] = await conn.execute(
    "SELECT doctorId, shiftType FROM schedule_entries WHERE scheduleId = ?",
    [aprilSched[0].id]
  );
  prevMonthEntries = aprilEntries;
}

console.log(`📊 Dados carregados:`);
console.log(`   Médicos ativos: ${doctors.length}`);
console.log(`   Regras semanais: ${weeklyRules.length}`);
console.log(`   Regras FDS: ${weekendRules.length}`);
console.log(`   Exceções: ${exceptions.length}`);
console.log(`   Feriados de maio: ${holidays.length}`);
console.log(`   Entradas de abril (para balancear): ${prevMonthEntries.length}`);

// ── Funções auxiliares ────────────────────────────────────────────────────
function getDaysInMonth(year, month) {
  const days = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getWeekOfMonth(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function isBlockedByException(doctorId, date, shiftType, exceptions) {
  const dateStr = toDateStr(date);
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay();
  const weekOfMonth = getWeekOfMonth(date);

  return exceptions.some((ex) => {
    if (ex.doctorId !== doctorId) return false;
    if (ex.exceptionType !== "block") return false;
    let matchesDate = false;
    const exDate = ex.specificDate ? (typeof ex.specificDate === "string" ? ex.specificDate : new Date(ex.specificDate).toISOString().split("T")[0]) : null;
    if (ex.recurrenceType === "once" && exDate === dateStr) matchesDate = true;
    if (ex.recurrenceType === "monthly" && ex.month === month && ex.dayOfMonth === dayOfMonth) matchesDate = true;
    if (ex.recurrenceType === "annual" && ex.month === month && ex.dayOfMonth === dayOfMonth) matchesDate = true;
    if (ex.recurrenceType === "recurring" && ex.dayOfWeek === dayOfWeek) {
      if (!ex.weekOfMonth || ex.weekOfMonth === weekOfMonth) matchesDate = true;
    }
    if (!matchesDate) return false;
    return !ex.shiftType || ex.shiftType === "all_day" || ex.shiftType === shiftType;
  });
}

function hasConflict(entries, doctorId, dateStr, shiftType) {
  return entries.some((e) => e.doctorId === doctorId && e.entryDate === dateStr && e.shiftType === shiftType);
}

function countNights(entries, doctorId) {
  return entries.filter((e) => e.doctorId === doctorId && e.shiftType === "noite").length;
}

// ── Geração ───────────────────────────────────────────────────────────────
const year = 2026, month = 5;
const days = getDaysInMonth(year, month);
const entries = [];
const conflicts = [];

const holidayDates = new Set(holidays.map((h) => {
  const d = h.holidayDate;
  return typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
}));

console.log(`\n📅 Feriados de maio: ${[...holidayDates].join(", ") || "nenhum"}`);

const residents = doctors.filter((d) => d.category === "resident");
let residentIdx = 0;

// ── PASSO 1: Regras semanais fixas ────────────────────────────────────────
for (const day of days) {
  if (isWeekend(day)) continue;
  const dateStr = toDateStr(day);
  const dow = day.getDay();
  const weekOfMonth = getWeekOfMonth(day);
  const isOddWeek = weekOfMonth % 2 === 1;

  const rulesForDay = weeklyRules.filter((r) => r.dayOfWeek === dow);
  for (const rule of rulesForDay) {
    if (rule.weekAlternation === "odd" && !isOddWeek) continue;
    if (rule.weekAlternation === "even" && isOddWeek) continue;
    if (isBlockedByException(rule.doctorId, day, rule.shiftType, exceptions)) continue;
    if (hasConflict(entries, rule.doctorId, dateStr, rule.shiftType)) continue;
    entries.push({ doctorId: rule.doctorId, entryDate: dateStr, shiftType: rule.shiftType, isFixed: 1 });
  }
}

// ── PASSO 2: Exceções force_shift ─────────────────────────────────────────
for (const ex of exceptions) {
  if (ex.exceptionType !== "force_shift") continue;
  if (!ex.shiftType || ex.shiftType === "all_day") continue;
  for (const day of days) {
    const dateStr = toDateStr(day);
    const m = day.getMonth() + 1;
    const dom = day.getDate();
    const dow = day.getDay();
    const wom = getWeekOfMonth(day);
    const exDate = ex.specificDate ? (typeof ex.specificDate === "string" ? ex.specificDate.split("T")[0] : new Date(ex.specificDate).toISOString().split("T")[0]) : null;
    let matches = false;
    if (ex.recurrenceType === "once" && exDate === dateStr) matches = true;
    if (ex.recurrenceType === "monthly" && ex.month === m && ex.dayOfMonth === dom) matches = true;
    if (ex.recurrenceType === "annual" && ex.month === m && ex.dayOfMonth === dom) matches = true;
    if (ex.recurrenceType === "recurring" && ex.dayOfWeek === dow) {
      if (!ex.weekOfMonth || ex.weekOfMonth === wom) matches = true;
    }
    if (!matches) continue;
    if (!hasConflict(entries, ex.doctorId, dateStr, ex.shiftType)) {
      entries.push({ doctorId: ex.doctorId, entryDate: dateStr, shiftType: ex.shiftType, isFixed: 1 });
    }
  }
}

// ── PASSO 3: Finais de semana ─────────────────────────────────────────────
// Pools de elegíveis
const fdsSabSusPool = doctors.filter((d) => d.canSabado && d.hasSus && d.canFinalDeSemana);
const fdsSabConvPool = doctors.filter((d) => {
  const hasRule = weekendRules.some((r) => r.doctorId === d.id && (r.dayType === "sabado" || r.dayType === "ambos") && r.shiftType === "plantao_24h");
  return hasRule || (d.canSabado && d.hasConvenio && d.can24h && d.canFinalDeSemana);
});
const fdsDomPool = doctors.filter((d) => d.canDomingo && d.canFinalDeSemana && d.category !== "resident");

// Contadores inicializados com carga de abril
function buildCounter(pool, shiftTypes) {
  const map = new Map(pool.map((d) => [d.id, 0]));
  for (const e of prevMonthEntries) {
    if (shiftTypes.includes(e.shiftType) && map.has(e.doctorId)) {
      map.set(e.doctorId, (map.get(e.doctorId) ?? 0) + 1);
    }
  }
  return map;
}
const fdsSabSusCount = buildCounter(fdsSabSusPool, ["manha_sus", "tarde_sus"]);
const fdsSabConvCount = buildCounter(fdsSabConvPool, ["plantao_24h"]);
const fdsDomCount = buildCounter(fdsDomPool, ["plantao_24h"]);

function pickFds(pool, counter, day, shiftType, usedToday, weekOfMonth) {
  // Primeiro: regra fixa para semana específica
  const isSaturday = day.getDay() === 6;
  const fixedRule = weekendRules.find((r) => {
    if (!pool.some((d) => d.id === r.doctorId)) return false;
    if (r.dayType === "sabado" && !isSaturday) return false;
    if (r.dayType === "domingo" && isSaturday) return false;
    if (r.weekOfMonth !== null && r.weekOfMonth !== weekOfMonth) return false;
    if (r.shiftType !== shiftType) return false;
    if (isBlockedByException(r.doctorId, day, shiftType, exceptions)) return false;
    if (usedToday.has(r.doctorId)) return false;
    return true;
  });
  if (fixedRule) return pool.find((d) => d.id === fixedRule.doctorId) ?? null;

  // Rodízio: menor contador
  const eligible = pool
    .filter((d) => !usedToday.has(d.id) && !isBlockedByException(d.id, day, shiftType, exceptions))
    .sort((a, b) => (counter.get(a.id) ?? 0) - (counter.get(b.id) ?? 0));
  return eligible[0] ?? null;
}

for (const day of days) {
  if (!isWeekend(day)) continue;
  const dateStr = toDateStr(day);
  const isSaturday = day.getDay() === 6;
  const weekOfMonth = getWeekOfMonth(day);
  const usedToday = new Set();

  if (isSaturday) {
    // SUS 12h
    const susDoc = pickFds(fdsSabSusPool, fdsSabSusCount, day, "manha_sus", usedToday, weekOfMonth);
    if (susDoc) {
      entries.push({ doctorId: susDoc.id, entryDate: dateStr, shiftType: "manha_sus", isFixed: 1 });
      entries.push({ doctorId: susDoc.id, entryDate: dateStr, shiftType: "tarde_sus", isFixed: 1 });
      fdsSabSusCount.set(susDoc.id, (fdsSabSusCount.get(susDoc.id) ?? 0) + 1);
      usedToday.add(susDoc.id);
    } else {
      conflicts.push({ date: dateStr, type: "missing_coverage", message: `Sem médico SUS para sábado ${dateStr}` });
    }

    // Convênio 24h
    const convDoc = pickFds(fdsSabConvPool, fdsSabConvCount, day, "plantao_24h", usedToday, weekOfMonth);
    if (convDoc) {
      entries.push({ doctorId: convDoc.id, entryDate: dateStr, shiftType: "plantao_24h", isFixed: 1 });
      fdsSabConvCount.set(convDoc.id, (fdsSabConvCount.get(convDoc.id) ?? 0) + 1);
      usedToday.add(convDoc.id);
    } else {
      conflicts.push({ date: dateStr, type: "missing_coverage", message: `Sem médico Convênio 24h para sábado ${dateStr}` });
    }

    // Residentes no SUS (rodízio, canSabado=true, canDomingo=false)
    const eligRes = residents.filter((r) => r.canSabado && !isBlockedByException(r.id, day, "manha_sus", exceptions));
    if (eligRes.length > 0) {
      const rm = eligRes[residentIdx % eligRes.length];
      const rt = eligRes[(residentIdx + 1) % eligRes.length];
      if (!hasConflict(entries, rm.id, dateStr, "manha_sus"))
        entries.push({ doctorId: rm.id, entryDate: dateStr, shiftType: "manha_sus", isFixed: 1 });
      if (!hasConflict(entries, rt.id, dateStr, "tarde_sus"))
        entries.push({ doctorId: rt.id, entryDate: dateStr, shiftType: "tarde_sus", isFixed: 1 });
      residentIdx += 2;
    }
  } else {
    // Domingo 24h
    const domDoc = pickFds(fdsDomPool, fdsDomCount, day, "plantao_24h", usedToday, weekOfMonth);
    if (domDoc) {
      entries.push({ doctorId: domDoc.id, entryDate: dateStr, shiftType: "plantao_24h", isFixed: 1 });
      fdsDomCount.set(domDoc.id, (fdsDomCount.get(domDoc.id) ?? 0) + 1);
    } else {
      conflicts.push({ date: dateStr, type: "missing_coverage", message: `Sem médico para domingo ${dateStr}` });
    }
  }
}

// ── PASSO 4 e 5: Noites ───────────────────────────────────────────────────
const nightDoctors = doctors.filter((d) => {
  const rules = weeklyRules.filter((r) => r.doctorId === d.id && r.participaRodizioNoite);
  return rules.length > 0 || d.participaRodizioNoite;
});

// Contador de noites do mês anterior
const nightPrev = new Map(nightDoctors.map((d) => [d.id, 0]));
for (const e of prevMonthEntries) {
  if (e.shiftType === "noite" && nightPrev.has(e.doctorId)) {
    nightPrev.set(e.doctorId, (nightPrev.get(e.doctorId) ?? 0) + 1);
  }
}

for (const day of days) {
  const dateStr = toDateStr(day);
  const dow = day.getDay();
  const weekOfMonth = getWeekOfMonth(day);
  const isOddWeek = weekOfMonth % 2 === 1;

  const hasNight = entries.some((e) => e.entryDate === dateStr && e.shiftType === "noite");
  if (hasNight) continue;

  // Noite fixa por regra semanal
  const fixedNight = weeklyRules.find((r) => {
    if (r.dayOfWeek !== dow || !r.noiteFixa) return false;
    if (r.weekAlternation === "odd" && !isOddWeek) return false;
    if (r.weekAlternation === "even" && isOddWeek) return false;
    return !isBlockedByException(r.doctorId, day, "noite", exceptions);
  });

  if (fixedNight) {
    if (!hasConflict(entries, fixedNight.doctorId, dateStr, "noite")) {
      entries.push({ doctorId: fixedNight.doctorId, entryDate: dateStr, shiftType: "noite", isFixed: 1 });
      continue;
    }
  }

  // Rodízio de noites
  const eligible = nightDoctors
    .filter((d) => {
      if (!d.canNoite) return false;
      if (isBlockedByException(d.id, day, "noite", exceptions)) return false;
      const prevDate = new Date(day);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = toDateStr(prevDate);
      if (entries.some((e) => e.doctorId === d.id && e.entryDate === prevDateStr && e.shiftType === "noite")) return false;
      if (d.limiteNoitesMes && d.limiteNoitesMes > 0 && countNights(entries, d.id) >= d.limiteNoitesMes) return false;
      return true;
    })
    .sort((a, b) => {
      const aN = countNights(entries, a.id) + (nightPrev.get(a.id) ?? 0);
      const bN = countNights(entries, b.id) + (nightPrev.get(b.id) ?? 0);
      return aN - bN;
    });

  if (eligible.length > 0) {
    entries.push({ doctorId: eligible[0].id, entryDate: dateStr, shiftType: "noite", isFixed: 0 });
  } else {
    conflicts.push({ date: dateStr, type: "missing_coverage", message: `Sem médico para noite em ${dateStr}` });
  }
}

// ── Salvar no banco ───────────────────────────────────────────────────────
// Limpar escala de maio existente
const [existSched] = await conn.execute("SELECT id FROM schedules WHERE year = 2026 AND month = 5 LIMIT 1");
let scheduleId;
if (existSched.length > 0) {
  scheduleId = existSched[0].id;
  await conn.execute("DELETE FROM schedule_entries WHERE scheduleId = ?", [scheduleId]);
  await conn.execute("UPDATE schedules SET status='draft', generatedAt=NOW() WHERE id=?", [scheduleId]);
} else {
  const [ins] = await conn.execute(
    "INSERT INTO schedules (year, month, status, generatedAt) VALUES (2026, 5, 'draft', NOW())"
  );
  scheduleId = ins.insertId;
}

// Inserir entradas
let inserted = 0;
const seen = new Set();
for (const e of entries) {
  const key = `${e.doctorId}-${e.entryDate}-${e.shiftType}`;
  if (seen.has(key)) continue;
  seen.add(key);
  await conn.execute(
    "INSERT INTO schedule_entries (scheduleId, doctorId, entryDate, shiftType, isFixed) VALUES (?, ?, ?, ?, ?)",
    [scheduleId, e.doctorId, e.entryDate, e.shiftType, e.isFixed]
  );
  inserted++;
}

// ── Relatório ─────────────────────────────────────────────────────────────
const byName = {};
for (const d of doctors) byName[d.id] = d.name;

const stats = {};
for (const e of entries) {
  if (!stats[e.doctorId]) stats[e.doctorId] = { total: 0, noites: 0, fds: 0 };
  stats[e.doctorId].total++;
  if (e.shiftType === "noite") stats[e.doctorId].noites++;
  const d = new Date(e.entryDate);
  if (d.getDay() === 0 || d.getDay() === 6) stats[e.doctorId].fds++;
}

console.log(`\n✅ Escala de maio gerada: ${inserted} entradas (scheduleId=${scheduleId})`);
if (conflicts.length > 0) {
  console.log(`⚠️  ${conflicts.length} conflitos:`);
  for (const c of conflicts) console.log(`   - ${c.date}: ${c.message}`);
} else {
  console.log(`✅ Sem conflitos!`);
}

console.log(`\n📊 Carga por médico — Maio 2026:`);
console.log(`${"Médico".padEnd(20)} ${"Total".padStart(6)} ${"Noites".padStart(7)} ${"FDS".padStart(5)}`);
console.log("-".repeat(42));
for (const [id, s] of Object.entries(stats).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`${(byName[id] ?? `ID ${id}`).padEnd(20)} ${String(s.total).padStart(6)} ${String(s.noites).padStart(7)} ${String(s.fds).padStart(5)}`);
}

// Verificar cobertura de dias úteis
const diasUteis = days.filter((d) => !isWeekend(d));
const turnos = ["manha_sus", "manha_convenio", "tarde_sus", "tarde_convenio", "noite"];
let cobertos = 0, descobertos = [];
for (const day of diasUteis) {
  const dateStr = toDateStr(day);
  if (holidayDates.has(dateStr)) continue; // feriado, pular
  const turnosDia = new Set(entries.filter((e) => e.entryDate === dateStr).map((e) => e.shiftType));
  const faltando = turnos.filter((t) => !turnosDia.has(t));
  if (faltando.length === 0) cobertos++;
  else descobertos.push(`${dateStr}: faltando ${faltando.join(", ")}`);
}
console.log(`\n📋 Cobertura dias úteis: ${cobertos}/${diasUteis.length - holidayDates.size} completos`);
if (descobertos.length > 0) {
  console.log(`Dias com turnos descobertos:`);
  for (const d of descobertos) console.log(`  - ${d}`);
}

await conn.end();
