import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const corepackBin = process.platform === "win32" ? "corepack.cmd" : "corepack";
const nodeModulesDir = path.join(projectRoot, "node_modules");
const envPath = path.join(projectRoot, ".env");
const envExamplePath = path.join(projectRoot, ".env.example");

function runStep(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n[setup] ${label}...`);

    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);

    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
      shell: useShell,
      windowsHide: true,
    });

    child.on("error", (error) => {
      reject(new Error(`${label} falhou ao iniciar: ${error.message}`));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} terminou com codigo ${code}.`));
    });
  });
}

function getServerUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function isLocalMariaDbTarget(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3306";
  return (host === "127.0.0.1" || host === "localhost") && port === "3306";
}

function findLocalMariaDbInstallation() {
  const baseDir = process.env.ProgramFiles || "C:\\Program Files";

  if (!fs.existsSync(baseDir)) return null;

  const candidates = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("MariaDB "))
    .map((entry) => path.join(baseDir, entry.name))
    .reverse();

  for (const installDir of candidates) {
    const executable = path.join(installDir, "bin", "mariadbd.exe");
    const defaultsFile = path.join(installDir, "data", "my.ini");

    if (fs.existsSync(executable) && fs.existsSync(defaultsFile)) {
      return { installDir, executable, defaultsFile };
    }
  }

  return null;
}

async function waitForMariaDb(serverUrl, attempts = 10, delayMs = 1000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const conn = await mysql.createConnection(serverUrl.toString());
      await conn.end();
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

async function tryStartLocalMariaDb(databaseUrl) {
  if (!isLocalMariaDbTarget(databaseUrl)) return false;

  const install = findLocalMariaDbInstallation();
  if (!install) return false;

  console.log(`[setup] Tentando iniciar MariaDB local em ${install.installDir}...`);

  const child = spawn(
    install.executable,
    [`--defaults-file=${install.defaultsFile}`, "--console"],
    {
      cwd: install.installDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }
  );

  child.unref();

  const serverUrl = getServerUrl(databaseUrl);
  const started = await waitForMariaDb(serverUrl);

  if (started) {
    console.log("[setup] MariaDB local iniciado com sucesso.");
  }

  return started;
}

async function ensureDatabaseExists(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\/+/, "");

  if (!databaseName) {
    throw new Error("DATABASE_URL precisa terminar com o nome do banco. Exemplo: mysql://root:senha@127.0.0.1:3306/escala_medica");
  }

  const serverUrl = getServerUrl(databaseUrl);
  let connection;

  try {
    connection = await mysql.createConnection(serverUrl.toString());
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ECONNREFUSED") {
      const started = await tryStartLocalMariaDb(databaseUrl);
      if (started) {
        connection = await mysql.createConnection(serverUrl.toString());
      } else {
        const host = parsed.hostname || "127.0.0.1";
        const port = parsed.port || "3306";
        throw new Error(
          `Nao foi possivel conectar em ${host}:${port}. Nenhum servidor MySQL/MariaDB esta ouvindo nesse endereco.\n` +
          "Instale ou inicie o banco local antes de rodar o setup."
        );
      }
    } else {
      throw error;
    }
  }

  try {
    const escapedDatabaseName = databaseName.replace(/`/g, "``");
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${escapedDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await connection.end();
  }
}

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("[setup] Arquivo .env criado a partir de .env.example.");
}

dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("mysql://root:senha@127.0.0.1:3306/escala_medica")) {
  console.error("DATABASE_URL nao configurado no arquivo .env.");
  console.error("Preencha a linha DATABASE_URL em C:\\Users\\fixad\\OneDrive\\Aplicativos\\Plantão\\.env e rode novamente.");
  process.exit(1);
}

if (!fs.existsSync(nodeModulesDir)) {
  await runStep(corepackBin, ["pnpm", "install"], "Instalando dependencias");
} else {
  console.log("[setup] Dependencias ja instaladas.");
}

console.log("[setup] Garantindo que o banco exista...");
await ensureDatabaseExists(process.env.DATABASE_URL);
await runStep(corepackBin, ["pnpm", "db:push"], "Aplicando schema no banco");
await runStep(process.execPath, ["sync-april-maio-2026.mjs"], "Sincronizando abril e maio de 2026");

console.log("\n[setup] Ambiente pronto. Iniciando servidor de desenvolvimento...");
await runStep(process.execPath, ["scripts/run-dev.mjs"], "Servidor");
