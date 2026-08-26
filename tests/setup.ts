import { config } from "dotenv";
import fs from "node:fs";

if (fs.existsSync(".env.test")) {
  config({ path: ".env.test" });
} else {
  console.warn(
    "[tests] .env.test not found — falling back to .env. " +
      "Create a dedicated .env.test pointing at a disposable database " +
      "before running tests, so they don't run against real data.",
  );
  config();
}
