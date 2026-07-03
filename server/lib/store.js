import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");

function filePath(name) {
  return path.join(DATA_DIR, name);
}

export async function readJson(name, fallback) {
  try {
    const raw = await fs.readFile(filePath(name), "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export async function writeJson(name, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath(name), JSON.stringify(data, null, 2), "utf-8");
  return data;
}
