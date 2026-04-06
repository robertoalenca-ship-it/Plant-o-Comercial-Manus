import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const entryPoint = path.join(projectRoot, "dist", "index.js");

process.env.NODE_ENV = "production";
await import(entryPoint);
