import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./db.ts";

const dir = dirname(fileURLToPath(import.meta.url));
await pool.query(readFileSync(join(dir, "schema.sql"), "utf8"));
console.log("Migration complete.");
await pool.end();
