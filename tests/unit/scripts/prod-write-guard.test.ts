import { describe, it, expect } from "vitest";

import { isLocalDatabaseHost } from "../../../scripts/prod-write-guard";

// La excepción de localhost es lo único que deja escribir sin confirmación:
// tiene que ser exacta, porque un falso positivo saltea la barrera contra la
// base real.
describe("isLocalDatabaseHost", () => {
  it("acepta localhost y 127.0.0.1, con o sin puerto", () => {
    expect(isLocalDatabaseHost("localhost")).toBe(true);
    expect(isLocalDatabaseHost("localhost:51214")).toBe(true);
    expect(isLocalDatabaseHost("127.0.0.1:5432")).toBe(true);
    expect(isLocalDatabaseHost("LOCALHOST:5432")).toBe(true);
  });

  it("rechaza cualquier host remoto, aunque contenga 'localhost'", () => {
    expect(
      isLocalDatabaseHost("aws-0-sa-east-1.pooler.supabase.com:6543"),
    ).toBe(false);
    expect(isLocalDatabaseHost("localhost.evil.com:5432")).toBe(false);
    expect(isLocalDatabaseHost("db.localhost-prod.supabase.co")).toBe(false);
    expect(isLocalDatabaseHost("(DATABASE_URL no seteada)")).toBe(false);
  });
});
