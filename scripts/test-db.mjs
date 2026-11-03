import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
console.log("host=", url?.match(/@([^/]+)/)?.[1]);

const sql = neon(url);
try {
  const r = await sql`select 1 as ok, current_database() as db, now() as ts`;
  console.log("OK", r);
} catch (e) {
  console.error("FAIL", e?.message || e);
  process.exitCode = 1;
}
