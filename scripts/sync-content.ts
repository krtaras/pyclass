import { config } from "dotenv";
config({ path: ".env.local" });

import { syncCourseContent } from "../src/lib/content-sync/sync";

async function main() {
  const report = await syncCourseContent();
  console.log("Content sync OK", report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
