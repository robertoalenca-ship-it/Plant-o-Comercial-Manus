import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const customEnvFile = path.join(projectRoot, ".env.docker");
const fallbackEnvFile = path.join(projectRoot, ".env.docker.example");
const selectedEnvFile = existsSync(customEnvFile) ? customEnvFile : fallbackEnvFile;
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("[docker] Informe os argumentos do docker compose.");
  process.exit(1);
}

const child = spawn(
  "docker",
  ["compose", "--env-file", selectedEnvFile, ...args],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[docker] Falha ao executar docker compose:", error);
  process.exit(1);
});
