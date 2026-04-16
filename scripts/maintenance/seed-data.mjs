/**
 * Seed completo com dados reais do documento de regras
 * Executa: node seed-data.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Limpar dados existentes (ordem inversa de dependência) ──────────────────
console.log("🧹 Limpando dados existentes...");
await conn.execute("DELETE FROM monthly_exceptions");
await conn.execute("DELETE FROM weekend_rules");
await conn.execute("DELETE FROM weekly_rules");
await conn.execute("DELETE FROM date_unavailabilities");
await conn.execute("DELETE FROM fixed_unavailabilities");
await conn.execute("DELETE FROM night_rotation_state");
await conn.execute("DELETE FROM doctors");

// ─── MÉDICOS ─────────────────────────────────────────────────────────────────
console.log("👨‍⚕️ Inserindo médicos...");

const COLORS = [
  "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6",
  "#EC4899","#06B6D4","#84CC16","#F97316","#6366F1",
  "#14B8A6","#D946EF","#0EA5E9","#A3E635","#FB923C",
  "#A78BFA","#34D399","#FCD34D","#F87171","#60A5FA",
  "#4ADE80","#FACC15",
];

// Médicos titulares
const titulares = [
  // id, name, shortName, hasSus, hasConvenio, canManhaSus, canManhaConvenio, canTardeSus, canTardeConvenio, canNoite, canFds, canSab, canDom, can24h, participaRodizio
  ["Humberto",        "Humberto",   true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false, true],
  ["Luiz Rogério",    "Luiz R.",    true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false, true],
  ["Berg",            "Berg",       true,  false, true,  false, true,  false, true,  true,  true,  true,  false, true],
  ["Nelio",           "Nelio",      true,  false, true,  false, true,  false, true,  true,  true,  true,  false, true],
  ["Erisvaldo",       "Erisvaldo",  false, true,  false, true,  false, true,  true,  true,  true,  true,  true,  false],
  ["Daniel Osamu",    "D.Osamu",    true,  false, true,  false, true,  false, false, false, false, false, false, false],
  ["Juarez",          "Juarez",     true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false, true],
  ["Marcela",         "Marcela",    false, true,  false, true,  false, true,  false, true,  false, true,  false, false],
  ["Luan",            "Luan",       false, true,  false, true,  false, true,  true,  false, false, false, false, true],
  ["Fernando Melo",   "F.Melo",     true,  false, true,  false, true,  false, true,  true,  true,  false, false, true],
  ["Rigel",           "Rigel",      true,  false, true,  false, true,  false, true,  false, false, false, false, true],
  ["Daniel Souza",    "D.Souza",    true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false, true],
  ["Breno",           "Breno",      true,  false, true,  false, true,  false, true,  true,  true,  true,  false, true],
  ["Danilo Freire",   "D.Freire",   false, true,  false, true,  false, true,  false, false, false, false, false, false],
  ["Ítalo Bacellar",  "Ítalo",      true,  true,  true,  true,  true,  true,  true,  true,  true,  false, true,  false],
  ["Roberto Filho",   "R.Filho",    true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false, true],
  ["Caio Petruz",     "C.Petruz",   false, true,  false, true,  false, true,  false, true,  true,  false, false, false],
  ["Danilo Fonseca",  "D.Fonseca",  true,  true,  true,  true,  true,  true,  true,  true,  false, true,  false, false],
  ["Caio Silva",      "C.Silva",    true,  false, true,  false, true,  false, false, true,  true,  false, false, false],
  ["Walesca",         "Walesca",    true,  false, true,  false, true,  false, false, true,  true,  false, false, false],
  ["Thaiane",         "Thaiane",    true,  false, true,  false, true,  false, false, true,  true,  false, false, false],
  ["Lara",            "Lara",       true,  false, true,  false, true,  false, false, true,  true,  false, false, false],
];

// Residentes (últimos 4)
const residentNames = ["Caio Silva", "Walesca", "Thaiane", "Lara"];

const doctorIds = {};
for (let i = 0; i < titulares.length; i++) {
  const [name, shortName, hasSus, hasConvenio, canManhaSus, canManhaConvenio, canTardeSus, canTardeConvenio, canNoite, canFds, canSab, canDom, can24h, participaRodizio] = titulares[i];
  const category = residentNames.includes(name) ? "resident" : "titular";
  const cor = COLORS[i % COLORS.length];
  const [result] = await conn.execute(
    `INSERT INTO doctors (name, shortName, category, hasSus, hasConvenio, canManhaSus, canManhaConvenio, canTardeSus, canTardeConvenio, canNoite, canFinalDeSemana, canSabado, canDomingo, can24h, participaRodizioNoite, prioridade, cor, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'media', ?, 1)`,
    [name, shortName, category, hasSus, hasConvenio, canManhaSus, canManhaConvenio, canTardeSus, canTardeConvenio, canNoite, canFds, canSab, canDom, can24h, participaRodizio, cor]
  );
  doctorIds[name] = result.insertId;
  console.log(`  ✅ ${name} (id=${result.insertId})`);
}

// ─── MÉDICOS SESAB ────────────────────────────────────────────────────────────
console.log("🏥 Inserindo médicos SESAB...");
const sesabMedicos = [
  ["Roberto Bastos de Alencar Filho", "R.Bastos"],
  ["Henrique Ceravolo Sereza", "H.Ceravolo"],
  ["Erisvaldo Gonçalves Rodrigues", "Erisvaldo G."],
  ["Francisco Noronha Guedes", "F.Noronha"],
  ["Danilo S. Freire Araújo", "D.Freire A."],
  ["Danilo Barbosa Fonseca", "D.Barbosa"],
  ["Caio Petrus", "C.Petrus"],
  ["Bruno Jales", "B.Jales"],
  ["Juarez Sebastian", "J.Sebastian"],
  ["Fernando Melo", "F.Melo S."],
  ["Breno Aguiar", "B.Aguiar"],
];
for (let i = 0; i < sesabMedicos.length; i++) {
  const [name, shortName] = sesabMedicos[i];
  const cor = COLORS[(titulares.length + i) % COLORS.length];
  const [result] = await conn.execute(
    `INSERT INTO doctors (name, shortName, category, hasSus, hasConvenio, canManhaSus, canManhaConvenio, canTardeSus, canTardeConvenio, canNoite, canFinalDeSemana, canSabado, canDomingo, can24h, participaRodizioNoite, prioridade, cor, ativo)
     VALUES (?, ?, 'sesab', 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 'media', ?, 1)`,
    [name, shortName, cor]
  );
  console.log(`  ✅ SESAB: ${name}`);
}

// ─── REGRAS SEMANAIS FIXAS ────────────────────────────────────────────────────
console.log("\n📅 Inserindo regras semanais...");

const rules = [
  // SEGUNDA (dayOfWeek=1)
  // Humberto: Convênio tarde e participa do rodízio das noites
  [doctorIds["Humberto"],       1, "tarde_convenio", "all",  true,  false, "Humberto - tarde convênio toda segunda"],
  // Luiz Rogério: Convênio manhã e participa do rodízio das noites
  [doctorIds["Luiz Rogério"],   1, "manha_convenio", "all",  true,  false, "Luiz Rogério - manhã convênio toda segunda"],
  // Berg: 2ª e 4ª segunda no SUS e participa do rodízio das noites
  [doctorIds["Berg"],           1, "manha_sus",      "even", true,  false, "Berg - manhã SUS 2ª e 4ª segunda"],
  [doctorIds["Berg"],           1, "tarde_sus",      "even", true,  false, "Berg - tarde SUS 2ª e 4ª segunda"],
  // Nelio: 1ª e 3ª segunda no SUS e participa do rodízio das noites
  [doctorIds["Nelio"],          1, "manha_sus",      "odd",  true,  false, "Nelio - manhã SUS 1ª e 3ª segunda"],
  [doctorIds["Nelio"],          1, "tarde_sus",      "odd",  true,  false, "Nelio - tarde SUS 1ª e 3ª segunda"],

  // TERÇA (dayOfWeek=2)
  // Erisvaldo: Convênio dia (manhã e tarde) e todas as noites (noite fixa)
  [doctorIds["Erisvaldo"],      2, "manha_convenio", "all",  false, false, "Erisvaldo - manhã convênio terça"],
  [doctorIds["Erisvaldo"],      2, "tarde_convenio", "all",  false, false, "Erisvaldo - tarde convênio terça"],
  [doctorIds["Erisvaldo"],      2, "noite",          "all",  false, true,  "Erisvaldo - noite fixa terça"],
  // Daniel Osamu: SUS dia
  [doctorIds["Daniel Osamu"],   2, "manha_sus",      "all",  false, false, "Daniel Osamu - manhã SUS terça"],
  [doctorIds["Daniel Osamu"],   2, "tarde_sus",      "all",  false, false, "Daniel Osamu - tarde SUS terça"],

  // QUARTA (dayOfWeek=3)
  // Juarez: médico da quarta (manhã e tarde SUS e convênio)
  [doctorIds["Juarez"],         3, "manha_sus",      "all",  false, false, "Juarez - manhã SUS quarta"],
  [doctorIds["Juarez"],         3, "tarde_sus",      "all",  false, false, "Juarez - tarde SUS quarta"],
  // Marcela: Convênio manhã
  [doctorIds["Marcela"],        3, "manha_convenio", "all",  false, false, "Marcela - manhã convênio quarta"],
  // Luan: Convênio tarde e participa do rodízio das noites
  [doctorIds["Luan"],           3, "tarde_convenio", "all",  true,  false, "Luan - tarde convênio quarta"],
  // Fernando Melo: manhã SUS e participa do rodízio das noites
  [doctorIds["Fernando Melo"],  3, "manha_sus",      "all",  true,  false, "Fernando Melo - manhã SUS quarta"],
  // Rigel: tarde SUS e participa do rodízio das noites
  [doctorIds["Rigel"],          3, "tarde_sus",      "all",  true,  false, "Rigel - tarde SUS quarta"],
  // Daniel Souza: noite no lugar das noites de Marcela (noite fixa de quarta)
  [doctorIds["Daniel Souza"],   3, "noite",          "all",  false, true,  "Daniel Souza - noite fixa quarta (lugar de Marcela)"],

  // QUINTA (dayOfWeek=4)
  // Erisvaldo: convênio manhã e tarde, não entra no rodízio da noite
  [doctorIds["Erisvaldo"],      4, "manha_convenio", "all",  false, false, "Erisvaldo - manhã convênio quinta"],
  [doctorIds["Erisvaldo"],      4, "tarde_convenio", "all",  false, false, "Erisvaldo - tarde convênio quinta"],
  // Daniel Souza: 1ª e 3ª quinta manhã SUS, tarde SUS e participa do rodízio das noites
  [doctorIds["Daniel Souza"],   4, "manha_sus",      "odd",  true,  false, "Daniel Souza - manhã SUS 1ª e 3ª quinta"],
  [doctorIds["Daniel Souza"],   4, "tarde_sus",      "odd",  true,  false, "Daniel Souza - tarde SUS 1ª e 3ª quinta"],
  // Breno: 2ª e 4ª quinta tarde SUS e participa do rodízio das noites
  [doctorIds["Breno"],          4, "tarde_sus",      "even", true,  false, "Breno - tarde SUS 2ª e 4ª quinta"],
  // Nelio: 2ª e 4ª quinta manhã SUS e participa do rodízio das noites
  [doctorIds["Nelio"],          4, "manha_sus",      "even", true,  false, "Nelio - manhã SUS 2ª e 4ª quinta"],

  // SEXTA (dayOfWeek=5)
  // Danilo Freire: convênio manhã
  [doctorIds["Danilo Freire"],  5, "manha_convenio", "all",  false, false, "Danilo Freire - manhã convênio sexta"],
  // Daniel Souza: manhã SUS, tarde e noite convênio (exceto 4ª sexta)
  [doctorIds["Daniel Souza"],   5, "manha_sus",      "all",  false, false, "Daniel Souza - manhã SUS sexta"],
  [doctorIds["Daniel Souza"],   5, "tarde_convenio", "all",  false, false, "Daniel Souza - tarde convênio sexta"],
  [doctorIds["Daniel Souza"],   5, "noite",          "all",  false, true,  "Daniel Souza - noite fixa sexta"],
  // Ítalo Bacellar: 2ª sexta tarde SUS; 4ª sexta manhã e tarde SUS; nesses dias faz sempre a noite
  [doctorIds["Ítalo Bacellar"], 5, "tarde_sus",      "even", false, false, "Ítalo Bacellar - tarde SUS 2ª sexta"],
  [doctorIds["Ítalo Bacellar"], 5, "noite",          "even", false, true,  "Ítalo Bacellar - noite fixa 2ª sexta"],
  // Rigel: participa do rodízio das noites (para compensar por não poder FDS)
  [doctorIds["Rigel"],          5, "tarde_sus",      "all",  true,  false, "Rigel - tarde SUS sexta + rodízio noite"],
];

for (const [doctorId, dayOfWeek, shiftType, weekAlternation, participaRodizioNoite, noiteFixa, obs] of rules) {
  if (!doctorId) { console.warn(`  ⚠️  Médico não encontrado para regra: ${obs}`); continue; }
  await conn.execute(
    `INSERT INTO weekly_rules (doctorId, dayOfWeek, shiftType, weekAlternation, participaRodizioNoite, noiteFixa, priority, observacoes, ativo)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1)`,
    [doctorId, dayOfWeek, shiftType, weekAlternation, participaRodizioNoite, noiteFixa, obs]
  );
  console.log(`  ✅ Regra: ${obs}`);
}

// ─── REGRAS DE FINAIS DE SEMANA ───────────────────────────────────────────────
console.log("\n🏖️ Inserindo regras de finais de semana...");

const weekendRules = [
  // Roberto Filho: sábado ou domingo (plantão 24h convênio)
  [doctorIds["Roberto Filho"],  "ambos",   "plantao_24h", null, "Roberto Filho - 24h FDS"],
  // Fernando Melo: sábado
  [doctorIds["Fernando Melo"],  "sabado",  "manha_sus",   null, "Fernando Melo - manhã SUS sábado"],
  [doctorIds["Fernando Melo"],  "sabado",  "tarde_sus",   null, "Fernando Melo - tarde SUS sábado"],
  // Marcela: preferencialmente 1º domingo de cada mês
  [doctorIds["Marcela"],        "domingo", "plantao_24h", 1,    "Marcela - 24h 1º domingo"],
  // Caio Petruz: sábado durante o dia (convênio)
  [doctorIds["Caio Petruz"],    "sabado",  "plantao_24h", null, "Caio Petruz - 24h sábado"],
  // Daniel Souza: sábado ou domingo
  [doctorIds["Daniel Souza"],   "ambos",   "plantao_24h", null, "Daniel Souza - 24h FDS"],
  // Erisvaldo: sábado ou domingo
  [doctorIds["Erisvaldo"],      "ambos",   "plantao_24h", null, "Erisvaldo - 24h FDS"],
  // Danilo Fonseca: 4º domingo
  [doctorIds["Danilo Fonseca"], "domingo", "plantao_24h", 4,    "Danilo Fonseca - 24h 4º domingo"],
  // Ítalo Bacellar: 2º e 4º sábados de cada mês no convênio 24h
  [doctorIds["Ítalo Bacellar"], "sabado",  "plantao_24h", 2,    "Ítalo Bacellar - 24h 2º sábado"],
  [doctorIds["Ítalo Bacellar"], "sabado",  "plantao_24h", 4,    "Ítalo Bacellar - 24h 4º sábado"],
  // Breno: 1º e 3º sábado e domingo
  [doctorIds["Breno"],          "sabado",  "plantao_24h", 1,    "Breno - 24h 1º sábado"],
  [doctorIds["Breno"],          "domingo", "plantao_24h", 1,    "Breno - 24h 1º domingo"],
  [doctorIds["Breno"],          "sabado",  "plantao_24h", 3,    "Breno - 24h 3º sábado"],
  [doctorIds["Breno"],          "domingo", "plantao_24h", 3,    "Breno - 24h 3º domingo"],
  // Nelio: geralmente 3º domingo
  [doctorIds["Nelio"],          "domingo", "plantao_24h", 3,    "Nelio - 24h 3º domingo"],
];

for (const [doctorId, dayType, shiftType, weekOfMonth, obs] of weekendRules) {
  if (!doctorId) { console.warn(`  ⚠️  Médico não encontrado: ${obs}`); continue; }
  await conn.execute(
    `INSERT INTO weekend_rules (doctorId, dayType, shiftType, weekOfMonth, priority, observacoes, ativo)
     VALUES (?, ?, ?, ?, 0, ?, 1)`,
    [doctorId, dayType, shiftType, weekOfMonth ?? null, obs]
  );
  console.log(`  ✅ FDS: ${obs}`);
}

// ─── EXCEÇÕES DE MAIO ─────────────────────────────────────────────────────────
console.log("\n⚠️ Inserindo exceções de maio...");

const danielSouzaId = doctorIds["Daniel Souza"];
const brenoId = doctorIds["Breno"];
const marcelaId = doctorIds["Marcela"];

const exceptions = [
  // Daniel Souza em maio fará curso nos dias 8 e 29 (bloqueio total)
  [danielSouzaId, "block", "once", "2025-05-08", null, null, "all_day", null, "Daniel Souza - curso dia 8 de maio"],
  [danielSouzaId, "block", "once", "2025-05-29", null, null, "all_day", null, "Daniel Souza - curso dia 29 de maio"],
  // Daniel Souza não estará nos finais de semana 8, 9, 30 e 31 de maio
  [danielSouzaId, "block", "once", "2025-05-09", null, null, "all_day", null, "Daniel Souza - indisponível FDS 9 de maio"],
  [danielSouzaId, "block", "once", "2025-05-30", null, null, "all_day", null, "Daniel Souza - indisponível FDS 30 de maio"],
  [danielSouzaId, "block", "once", "2025-05-31", null, null, "all_day", null, "Daniel Souza - indisponível FDS 31 de maio"],
  // Breno em maio ficará na quinta dia 7 e 28 no lugar de Daniel Souza
  [brenoId, "force_shift", "once", "2025-05-07", null, null, "tarde_sus", null, "Breno - quinta dia 7 de maio (lugar de D.Souza)"],
  [brenoId, "force_shift", "once", "2025-05-28", null, null, "tarde_sus", null, "Breno - quinta dia 28 de maio (lugar de D.Souza)"],
  // Marcela em maio deve ser colocada no domingo dia 17
  [marcelaId, "force_shift", "once", "2025-05-17", null, null, "plantao_24h", null, "Marcela - domingo dia 17 de maio"],
];

for (const [doctorId, exceptionType, recurrenceType, specificDate, month, dayOfMonth, shiftType, replaceDoctorId, reason] of exceptions) {
  if (!doctorId) { console.warn(`  ⚠️  Médico não encontrado: ${reason}`); continue; }
  await conn.execute(
    `INSERT INTO monthly_exceptions (doctorId, exceptionType, recurrenceType, specificDate, month, dayOfMonth, shiftType, replaceDoctorId, reason, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [doctorId, exceptionType, recurrenceType, specificDate, month, dayOfMonth, shiftType, replaceDoctorId, reason]
  );
  console.log(`  ✅ Exceção: ${reason}`);
}

// ─── FERIADOS NACIONAIS ───────────────────────────────────────────────────────
console.log("\n🎉 Inserindo feriados nacionais...");
const feriados = [
  ["Ano Novo",              "2025-01-01", true,  "annual"],
  ["Carnaval",              "2025-03-03", false, "once"],
  ["Carnaval",              "2025-03-04", false, "once"],
  ["Sexta-feira Santa",     "2025-04-18", true,  "once"],
  ["Tiradentes",            "2025-04-21", true,  "annual"],
  ["Dia do Trabalho",       "2025-05-01", true,  "annual"],
  ["Corpus Christi",        "2025-06-19", true,  "once"],
  ["Independência do Brasil","2025-09-07", true, "annual"],
  ["Nossa Sra. Aparecida",  "2025-10-12", true,  "annual"],
  ["Finados",               "2025-11-02", true,  "annual"],
  ["Proclamação da República","2025-11-15", true, "annual"],
  ["Natal",                 "2025-12-25", true,  "annual"],
];
for (const [name, holidayDate, isNational, recurrenceType] of feriados) {
  await conn.execute(
    `INSERT INTO holidays (name, holidayDate, isNational, recurrenceType) VALUES (?, ?, ?, ?)`,
    [name, holidayDate, isNational, recurrenceType]
  );
  console.log(`  ✅ Feriado: ${name}`);
}

await conn.end();
console.log("\n🎉 Seed concluído com sucesso!");
console.log(`   ${titulares.length} médicos titulares/residentes`);
console.log(`   ${sesabMedicos.length} médicos SESAB`);
console.log(`   ${rules.length} regras semanais`);
console.log(`   ${weekendRules.length} regras de finais de semana`);
console.log(`   ${exceptions.length} exceções de maio`);
console.log(`   ${feriados.length} feriados nacionais`);
