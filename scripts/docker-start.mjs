import mysql from "mysql2/promise";
import { spawn } from "node:child_process";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasValue(value) {
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
  const databaseUrl = `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  process.env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

async function waitForDatabase() {
  const databaseUrl = ensureDatabaseUrl();
  const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? "120000");
  const intervalMs = Number(process.env.DB_WAIT_INTERVAL_MS ?? "3000");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const connection = await mysql.createConnection(databaseUrl);
      await connection.query("select 1");
      await connection.end();
      console.log("[docker] MySQL conectado.");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[docker] Aguardando MySQL: ${message}`);
      await sleep(intervalMs);
    }
  }

  throw new Error("Tempo esgotado aguardando o MySQL ficar disponivel.");
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Comando falhou: ${command} ${args.join(" ")} (exit ${code ?? "null"})`));
    });
  });
}

await waitForDatabase();
console.log("[docker] Aplicando migrations...");
await runCommand("pnpm", ["db:migrate:prod"]);
console.log("[docker] Carregando base inicial da ortopedia quando necessario...");
await runCommand("pnpm", ["db:bootstrap:prod"]);
console.log("[docker] Iniciando aplicacao...");
await import("./run-prod.mjs");
