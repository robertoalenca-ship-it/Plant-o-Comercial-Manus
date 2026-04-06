import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");

if (!fs.existsSync(tsxCli)) {
  console.error("tsx nao encontrado. Rode `corepack pnpm install` antes de iniciar o projeto.");
  process.exit(1);
}

const child = spawn(process.execPath, [tsxCli, "watch", "server/_core/index.ts"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
});

child.on("error", (error) => {
  console.error(`Falha ao iniciar o servidor de desenvolvimento: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
