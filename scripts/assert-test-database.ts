/**
 * Guard: prevent integration tests from connecting to non-test databases.
 * Exits the process with code 1 if the DATABASE_URL does not contain the
 * expected test database name.
 */
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
