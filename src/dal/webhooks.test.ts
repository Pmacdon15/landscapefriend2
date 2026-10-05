import { describe, expect, it, vi } from "vitest";
import { upsertOrganizationDb, upsertUserDb } from "@/db/queries/webhooks";
import { handleOrganizationCreatedDal, handleUserCreatedDal } from "./webhooks";

vi.mock("@/db/queries/webhooks", () => ({
  upsertOrganizationDb: vi.fn(),
  upsertUserDb: vi.fn(),
}));

describe("webhook DAL", () => {
  it("stores users and organizations", async () => {
    await handleUserCreatedDal("user_1", "Jane Doe", "jane@example.com");
    await handleOrganizationCreatedDal("org_1", "Green Co");
    expect(upsertUserDb).toHaveBeenCalledWith(
      "user_1",
      "Jane Doe",
      "jane@example.com",
    );
    expect(upsertOrganizationDb).toHaveBeenCalledWith("org_1", "Green Co");
  });
});
