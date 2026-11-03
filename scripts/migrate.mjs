import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const sql = neon(url);

const dir = "drizzle";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const raw = readFileSync(join(dir, file), "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`Applying ${file} (${statements.length} statements)...`);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log(`Done ${file}`);
}
console.log("Migrations applied.");
