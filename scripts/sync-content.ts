import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { syncCourseContent } = await import("../src/lib/content-sync/sync");
  const report = await syncCourseContent();
  console.log("Content sync OK", report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
