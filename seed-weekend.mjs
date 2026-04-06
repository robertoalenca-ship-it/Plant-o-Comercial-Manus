/**
 * Seed das regras de finais de semana com estrutura correta:
 *   SÁBADO: 1 médico SUS 12h + 1 médico Convênio 24h (+ residentes no SUS)
 *   DOMINGO: 1 médico 24h (SUS + Convênio)
 *   Rodízio automático equilibrado entre elegíveis
 *
 * As regras aqui definem PREFERÊNCIAS FIXAS (ex: Ítalo no 2º e 4º sábado convênio).
 * Nos demais FDS, o algoritmo faz rodízio automático pelo pool de elegíveis.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar IDs dos médicos
const [rows] = await conn.execute("SELECT id, name FROM doctors WHERE category != 'sesab'");
const byName = {};
for (const r of rows) byName[r.name] = r.id;

const id = (name) => {
  const v = byName[name];
  if (!v) console.warn(`⚠️  Médico não encontrado: ${name}`);
  return v;
};

// Limpar regras antigas
await conn.execute("DELETE FROM weekend_rules");
console.log("🧹 Regras de FDS limpas.");

/**
 * POOLS DE ELEGÍVEIS (configurados via atributos do médico no banco):
 *
 * Pool SUS 12h Sábado (canSabado=1, hasSus=1, canFinalDeSemana=1):
 *   Fernando Melo, Roberto Filho, Daniel Souza, Erisvaldo, Breno, Nelio
 *
 * Pool Convênio 24h Sábado (canSabado=1, hasConvenio=1, can24h=1, canFinalDeSemana=1):
 *   Ítalo Bacellar, Caio Petruz, Roberto Filho, Daniel Souza, Erisvaldo, Breno
 *
 * Pool Domingo 24h (canDomingo=1, canFinalDeSemana=1):
 *   Roberto Filho, Marcela, Daniel Souza, Erisvaldo, Danilo Fonseca, Breno, Nelio
 *
 * Regras fixas abaixo apenas definem PRIORIDADE em semanas específicas.
 * O rodízio preenche os demais FDS automaticamente.
 */

const rules = [
  // ─── SÁBADO: Convênio 24h com semana específica ───────────────────────────
  // Ítalo Bacellar: 2º e 4º sábado convênio 24h
  [id("Ítalo Bacellar"), "sabado", "plantao_24h", 2, "Ítalo Bacellar - Conv 24h 2º sábado"],
  [id("Ítalo Bacellar"), "sabado", "plantao_24h", 4, "Ítalo Bacellar - Conv 24h 4º sábado"],

  // Breno: 1º e 3º sábado (SUS 12h)
  [id("Breno"),          "sabado", "manha_sus",   1, "Breno - SUS 12h 1º sábado"],
  [id("Breno"),          "sabado", "manha_sus",   3, "Breno - SUS 12h 3º sábado"],

  // Fernando Melo: sábado SUS 12h (sem semana fixa = entra no rodízio geral)
  // Não precisa de regra fixa, será incluído pelo pool via atributos

  // Caio Petruz: sábado convênio 24h (sem semana fixa = entra no rodízio geral)
  // Não precisa de regra fixa, será incluído pelo pool via atributos

  // ─── DOMINGO: 24h com semana específica ──────────────────────────────────
  // Marcela: preferencialmente 1º domingo
  [id("Marcela"),        "domingo", "plantao_24h", 1, "Marcela - 24h 1º domingo"],

  // Danilo Fonseca: 4º domingo
  [id("Danilo Fonseca"), "domingo", "plantao_24h", 4, "Danilo Fonseca - 24h 4º domingo"],

  // Breno: 1º e 3º domingo
  [id("Breno"),          "domingo", "plantao_24h", 1, "Breno - 24h 1º domingo"],
  [id("Breno"),          "domingo", "plantao_24h", 3, "Breno - 24h 3º domingo"],

  // Nelio: geralmente 3º domingo
  [id("Nelio"),          "domingo", "plantao_24h", 3, "Nelio - 24h 3º domingo"],
];

for (const [doctorId, dayType, shiftType, weekOfMonth, obs] of rules) {
  if (!doctorId) continue;
  await conn.execute(
    `INSERT INTO weekend_rules (doctorId, dayType, shiftType, weekOfMonth, priority, observacoes, ativo)
     VALUES (?, ?, ?, ?, 10, ?, 1)`,
    [doctorId, dayType, shiftType, weekOfMonth ?? null, obs]
  );
  console.log(`  ✅ ${obs}`);
}

// ─── Atualizar atributos dos médicos para definir os pools ────────────────────
console.log("\n🔧 Atualizando atributos de FDS dos médicos...");

// Pool SUS 12h Sábado: canSabado=1, hasSus=1, canFinalDeSemana=1
const sabSusPool = ["Fernando Melo", "Roberto Filho", "Daniel Souza", "Erisvaldo", "Breno", "Nelio"];
for (const name of sabSusPool) {
  if (!id(name)) continue;
  await conn.execute(
    "UPDATE doctors SET canSabado=1, hasSus=1, canFinalDeSemana=1 WHERE id=?",
    [id(name)]
  );
  console.log(`  ✅ SUS Sábado pool: ${name}`);
}

// Pool Convênio 24h Sábado: canSabado=1, hasConvenio=1, can24h=1, canFinalDeSemana=1
const sabConvPool = ["Ítalo Bacellar", "Caio Petruz", "Roberto Filho", "Daniel Souza", "Erisvaldo", "Breno"];
for (const name of sabConvPool) {
  if (!id(name)) continue;
  await conn.execute(
    "UPDATE doctors SET canSabado=1, hasConvenio=1, can24h=1, canFinalDeSemana=1 WHERE id=?",
    [id(name)]
  );
  console.log(`  ✅ Conv 24h Sábado pool: ${name}`);
}

// Pool Domingo 24h: canDomingo=1, canFinalDeSemana=1
const domPool = ["Roberto Filho", "Marcela", "Daniel Souza", "Erisvaldo", "Danilo Fonseca", "Breno", "Nelio"];
for (const name of domPool) {
  if (!id(name)) continue;
  await conn.execute(
    "UPDATE doctors SET canDomingo=1, canFinalDeSemana=1 WHERE id=?",
    [id(name)]
  );
  console.log(`  ✅ Domingo 24h pool: ${name}`);
}

await conn.end();
console.log(`\n🎉 Seed de FDS concluído! ${rules.length} regras fixas de preferência inseridas.`);
console.log("   O rodízio automático preencherá os demais finais de semana.");
