import { describe, it, expect } from "vitest";

// We test the assert function by importing it and checking it throws on non-test databases.
// Valid test DB names end with _test.
import assertTestDatabase from "../scripts/assert-test-database";

describe("assertTestDatabase", () => {
  it("accepts a connection string ending in _test", () => {
    // Should not throw
    expect(() =>
      assertTestDatabase(
        "postgresql://user:pass@localhost:5432/photo_management_test?schema=public",
        "photo_management_test"
      )
    ).not.toThrow();
  });

  it("rejects a connection string that does not end in _test", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://user:pass@localhost:5432/photo_management?schema=public",
        "photo_management_test"
      )
    ).toThrow(/test database/i);
  });

  it("rejects a connection string where the database name does not match the expected test db", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://user:pass@localhost:5432/wrong_db_test?schema=public",
        "photo_management_test"
      )
    ).toThrow(/test database/i);
  });

  it("rejects when no database name can be parsed", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://user:pass@localhost:5432/",
        "photo_management_test"
      )
    ).toThrow(/test database/i);
  });
});
