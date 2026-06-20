import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export function appRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

