/**
 * Guard: prevent integration tests from connecting to non-test databases.
 * Exits the process with code 1 if the DATABASE_URL does not contain the
 * expected test database name.
 *
 * As a CLI script, reads DATABASE_URL from env (or .env.test) and checks
 * against the known test database name (photo_management_test).
 */

const EXPECTED_TEST_DB = "photo_management_test";
const SCRIPT_NAME = "assert-test-database";

export default function assertTestDatabase(
  databaseUrl: string,
  expectedDbName: string
): void {
  try {
    const url = new URL(databaseUrl);
    const dbName = url.pathname.replace(/^\//, "").split("?")[0];

    if (!dbName || !dbName.endsWith("_test") || dbName !== expectedDbName) {
      throw new Error(
        `Refusing to run integration tests: database "${dbName || "(unknown)"}" does not match expected test database "${expectedDbName}". ` +
        `Integration tests must only run against databases ending in "_test".`
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Refusing to run")) {
      throw e;
    }
    throw new Error(
      `Refusing to run integration tests: unable to parse test database URL. ` +
      `Ensure DATABASE_URL uses a valid test database ending in "_test".`
    );
  }
}

// CLI entry — detect if this file is the entry point being executed
const isCli = process.argv[1]?.includes(SCRIPT_NAME);

if (isCli) {
  (async () => {
    const { config } = await import("dotenv");
    config({ path: new URL("../.env.test", import.meta.url).pathname, override: true });

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("DATABASE_URL environment variable is not set");
      process.exit(1);
    }
    try {
      assertTestDatabase(dbUrl, EXPECTED_TEST_DB);
      console.log(`✓ Test database check passed: ${EXPECTED_TEST_DB}`);
    } catch (e) {
      console.error(e instanceof Error ? e.message : "Unknown error");
      process.exit(1);
    }
  })();
}
