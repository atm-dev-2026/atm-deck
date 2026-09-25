import { config, parse } from "dotenv";
import fs from "node:fs";

// Tests write and delete real rows, so they must never run against the app's
// own database. Require a dedicated .env.test — no fallback to .env.
if (!fs.existsSync(".env.test")) {
  throw new Error(
    "[tests] .env.test not found. Create one with DATABASE_URL pointing at a disposable " +
      "Postgres database (then `npx prisma migrate deploy` against it) before running tests.",
  );
}

// override: a DATABASE_URL already exported in the shell must not win over .env.test.
config({ path: ".env.test", override: true });

const testUrl = process.env.DATABASE_URL;
if (!testUrl) {
  throw new Error("[tests] .env.test must set DATABASE_URL.");
}

const appUrl = fs.existsSync(".env") ? parse(fs.readFileSync(".env")).DATABASE_URL : undefined;
if (appUrl && appUrl === testUrl) {
  throw new Error("[tests] .env.test's DATABASE_URL is the same database as .env — refusing to run.");
}
