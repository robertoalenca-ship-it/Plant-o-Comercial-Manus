/**
 * Importa a escala manual de abril 2026 no banco de dados
 * para que o algoritmo de geração de maio considere a carga acumulada
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar IDs dos médicos
const [rows] = await conn.execute("SELECT id, name FROM doctors");
const byName = {};
for (const r of rows) byName[r.name] = r.id;

const id = (name) => {
  const v = byName[name];
  if (!v) { console.warn(`⚠️  Médico não encontrado: "${name}"`); return null; }
  return v;
};

// Verificar se já existe escala de abril
const [existing] = await conn.execute(
  "SELECT COUNT(*) as cnt FROM schedule_entries WHERE MONTH(entryDate) = 4 AND YEAR(entryDate) = 2026"
);
if (existing[0].cnt > 0) {
  console.log(`⚠️  Já existem ${existing[0].cnt} entradas de abril. Limpando...`);
  await conn.execute("DELETE FROM schedule_entries WHERE MONTH(entryDate) = 4 AND YEAR(entryDate) = 2026");
}

// Verificar se existe escala de abril no banco de schedules
const [sched] = await conn.execute(
  "SELECT id FROM schedules WHERE year = 2026 AND month = 4 LIMIT 1"
);
let scheduleId;
if (sched.length === 0) {
  const [ins] = await conn.execute(
    "INSERT INTO schedules (year, month, status, generatedAt) VALUES (2026, 4, 'approved', NOW())"
  );
  scheduleId = ins.insertId;
  console.log(`✅ Escala de abril criada (id=${scheduleId})`);
} else {
  scheduleId = sched[0].id;
  await conn.execute("UPDATE schedules SET status='approved' WHERE id=?", [scheduleId]);
  console.log(`✅ Escala de abril existente (id=${scheduleId})`);
}

// Dados completos da escala de abril
// Formato: [data, turno, medico]
// turnos: manha_sus, manha_convenio, tarde_sus, tarde_convenio, noite, plantao_24h
const entradas = [
  // 01/04 Qua
  ["2026-04-01", "manha_sus",      "Fernando Melo"],
  ["2026-04-01", "manha_convenio", "Marcela"],
  ["2026-04-01", "tarde_sus",      "Rigel"],
  ["2026-04-01", "tarde_convenio", "Luan"],
  ["2026-04-01", "noite",          "Fernando Melo"],
  // 02/04 Qui
  ["2026-04-02", "manha_sus",      "Daniel Souza"],
  ["2026-04-02", "manha_convenio", "Erisvaldo"],
  ["2026-04-02", "tarde_sus",      "Daniel Souza"],
  ["2026-04-02", "tarde_convenio", "Erisvaldo"],
  ["2026-04-02", "noite",          "Daniel Souza"],
  // 03/04 Sex FERIADO
  ["2026-04-03", "manha_sus",      "Daniel Souza"],
  ["2026-04-03", "manha_convenio", "Daniel Souza"],
  // 04/04 Sáb
  ["2026-04-04", "plantao_24h",    "Daniel Souza"],  // Conv 24h
  ["2026-04-04", "manha_sus",      "Lara"],           // SUS 12h manhã
  ["2026-04-04", "tarde_sus",      "Lara"],           // SUS 12h tarde
  // 05/04 Dom
  ["2026-04-05", "plantao_24h",    "Felipe"],         // Conv+SUS dia
  ["2026-04-05", "noite",          "Lara"],           // Conv noite
  // 06/04 Seg
  ["2026-04-06", "manha_sus",      "Nelio"],
  ["2026-04-06", "manha_convenio", "Luiz Rogério"],
  ["2026-04-06", "tarde_sus",      "Nelio"],
  ["2026-04-06", "tarde_convenio", "Humberto"],
  ["2026-04-06", "noite",          "Nelio"],
  // 07/04 Ter
  ["2026-04-07", "manha_sus",      "Daniel Osamu"],
  ["2026-04-07", "manha_convenio", "Erisvaldo"],
  ["2026-04-07", "tarde_sus",      "Daniel Osamu"],
  ["2026-04-07", "tarde_convenio", "Erisvaldo"],
  ["2026-04-07", "noite",          "Erisvaldo"],
  // 08/04 Qua
  ["2026-04-08", "manha_sus",      "Fernando Melo"],
  ["2026-04-08", "manha_convenio", "Marcela"],
  ["2026-04-08", "tarde_sus",      "Rigel"],
  ["2026-04-08", "tarde_convenio", "Luan"],
  ["2026-04-08", "noite",          "Luan"],
  // 09/04 Qui
  ["2026-04-09", "manha_sus",      "Nelio"],
  ["2026-04-09", "manha_convenio", "Erisvaldo"],
  ["2026-04-09", "tarde_sus",      "Breno Aguiar"],
  ["2026-04-09", "tarde_convenio", "Erisvaldo"],
  ["2026-04-09", "noite",          "Breno Aguiar"],
  // 10/04 Sex
  ["2026-04-10", "manha_sus",      "Daniel Souza"],
  ["2026-04-10", "manha_convenio", "Danilo Freire"],
  ["2026-04-10", "tarde_sus",      "Ítalo Bacellar"],
  ["2026-04-10", "tarde_convenio", "Daniel Souza"],
  ["2026-04-10", "noite",          "Ítalo Bacellar"],
  // 11/04 Sáb
  ["2026-04-11", "plantao_24h",    "Ítalo Bacellar"], // Conv 24h
  ["2026-04-11", "manha_sus",      "Walesca"],         // SUS 12h manhã
  ["2026-04-11", "tarde_sus",      "Walesca"],         // SUS 12h tarde
  // 12/04 Dom
  ["2026-04-12", "plantao_24h",    "Marcela"],         // 24h (SUS+Conv)
  // 13/04 Seg
  ["2026-04-13", "manha_sus",      "Berg"],
  ["2026-04-13", "manha_convenio", "Luiz Rogério"],
  ["2026-04-13", "tarde_sus",      "Berg"],
  ["2026-04-13", "tarde_convenio", "Humberto"],
  ["2026-04-13", "noite",          "Luiz Rogério"],
  // 14/04 Ter
  ["2026-04-14", "manha_sus",      "Daniel Osamu"],
  ["2026-04-14", "manha_convenio", "Erisvaldo"],
  ["2026-04-14", "tarde_sus",      "Daniel Osamu"],
  ["2026-04-14", "tarde_convenio", "Erisvaldo"],
  ["2026-04-14", "noite",          "Erisvaldo"],
  // 15/04 Qua
  ["2026-04-15", "manha_sus",      "Fernando Melo"],
  ["2026-04-15", "manha_convenio", "Marcela"],
  ["2026-04-15", "tarde_sus",      "Rigel"],
  ["2026-04-15", "tarde_convenio", "Luan"],
  ["2026-04-15", "noite",          "Luan"],
  // 16/04 Qui
  ["2026-04-16", "manha_sus",      "Daniel Souza"],
  ["2026-04-16", "manha_convenio", "Erisvaldo"],
  ["2026-04-16", "tarde_sus",      "Daniel Souza"],
  ["2026-04-16", "tarde_convenio", "Erisvaldo"],
  ["2026-04-16", "noite",          "Daniel Souza"],
  // 17/04 Sex
  ["2026-04-17", "manha_sus",      "Caio Silva"],
  ["2026-04-17", "manha_convenio", "Danilo Freire"],
  ["2026-04-17", "tarde_sus",      "Caio Silva"],
  ["2026-04-17", "tarde_convenio", "Nelio"],
  ["2026-04-17", "noite",          "Rigel"],
  // 18/04 Sáb
  ["2026-04-18", "plantao_24h",    "Fernando Melo"],  // Conv 24h
  ["2026-04-18", "manha_sus",      "Caio Silva"],      // SUS 12h manhã
  ["2026-04-18", "tarde_sus",      "Caio Silva"],      // SUS 12h tarde
  // 19/04 Dom
  ["2026-04-19", "plantao_24h",    "Nelio"],           // 24h (SUS+Conv)
  // 20/04 Seg
  ["2026-04-20", "manha_sus",      "Nelio"],
  ["2026-04-20", "manha_convenio", "Luiz Rogério"],
  ["2026-04-20", "tarde_sus",      "Nelio"],
  ["2026-04-20", "tarde_convenio", "Humberto"],
  ["2026-04-20", "noite",          "Berg"],
  // 21/04 Ter FERIADO
  ["2026-04-21", "manha_sus",      "Erisvaldo"],
  ["2026-04-21", "manha_convenio", "Erisvaldo"],
  // 22/04 Qua
  ["2026-04-22", "manha_sus",      "Fernando Melo"],
  ["2026-04-22", "manha_convenio", "Marcela"],
  ["2026-04-22", "tarde_sus",      "Rigel"],
  ["2026-04-22", "tarde_convenio", "Luan"],
  ["2026-04-22", "noite",          "Fernando Melo"],
  // 23/04 Qui
  ["2026-04-23", "manha_sus",      "Nelio"],
  ["2026-04-23", "manha_convenio", "Erisvaldo"],
  ["2026-04-23", "tarde_sus",      "Breno Aguiar"],
  ["2026-04-23", "tarde_convenio", "Erisvaldo"],
  ["2026-04-23", "noite",          "Nelio"],
  // 24/04 Sex
  ["2026-04-24", "manha_sus",      "Ítalo Bacellar"],
  ["2026-04-24", "manha_convenio", "Danilo Freire"],
  ["2026-04-24", "tarde_sus",      "Ítalo Bacellar"],
  ["2026-04-24", "tarde_convenio", "Breno Aguiar"],
  ["2026-04-24", "noite",          "Ítalo Bacellar"],
  // 25/04 Sáb
  ["2026-04-25", "plantao_24h",    "Ítalo Bacellar"], // Conv 24h
  ["2026-04-25", "manha_sus",      "Thaiane"],         // SUS 12h manhã
  ["2026-04-25", "tarde_sus",      "Thaiane"],         // SUS 12h tarde
  // 26/04 Dom
  ["2026-04-26", "plantao_24h",    "Danilo Fonseca"],  // 24h (SUS+Conv)
  // 27/04 Seg
  ["2026-04-27", "manha_sus",      "Berg"],
  ["2026-04-27", "manha_convenio", "Luiz Rogério"],
  ["2026-04-27", "tarde_sus",      "Berg"],
  ["2026-04-27", "tarde_convenio", "Humberto"],
  ["2026-04-27", "noite",          "Humberto"],
  // 28/04 Ter
  ["2026-04-28", "manha_sus",      "Daniel Osamu"],
  ["2026-04-28", "manha_convenio", "Erisvaldo"],
  ["2026-04-28", "tarde_sus",      "Daniel Osamu"],
  ["2026-04-28", "tarde_convenio", "Erisvaldo"],
  ["2026-04-28", "noite",          "Erisvaldo"],
  // 29/04 Qua
  ["2026-04-29", "manha_sus",      "Fernando Melo"],
  ["2026-04-29", "manha_convenio", "Marcela"],
  ["2026-04-29", "tarde_sus",      "Rigel"],
  ["2026-04-29", "tarde_convenio", "Luan"],
  ["2026-04-29", "noite",          "Rigel"],
  // 30/04 Qui
  ["2026-04-30", "manha_sus",      "Daniel Souza"],
  ["2026-04-30", "manha_convenio", "Erisvaldo"],
  ["2026-04-30", "tarde_sus",      "Daniel Souza"],
  ["2026-04-30", "tarde_convenio", "Erisvaldo"],
  ["2026-04-30", "noite",          "Daniel Souza"],
];

let inseridos = 0;
let ignorados = 0;
for (const [data, turno, nome] of entradas) {
  const doctorId = id(nome);
  if (!doctorId) { ignorados++; continue; }
  await conn.execute(
    `INSERT INTO schedule_entries (scheduleId, doctorId, entryDate, shiftType, isFixed)
     VALUES (?, ?, ?, ?, 1)`,
    [scheduleId, doctorId, data, turno]
  );
  inseridos++;
}

console.log(`\n✅ Escala de abril importada: ${inseridos} entradas inseridas, ${ignorados} ignoradas.`);
console.log("   O algoritmo de geração de maio usará esses dados para balancear a carga.");

await conn.end();
