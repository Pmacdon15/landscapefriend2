import { auth, clerkClient } from "@clerk/nextjs/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuth } from "../../tests/helpers/clerk";
import { getOrganizationMembersDal } from "./clerk";

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: vi.fn() },
  clerkClient: vi.fn(),
}));

const members = (data: unknown[]) =>
  vi.mocked(clerkClient).mockResolvedValue({
    organizations: {
      getOrganizationMembershipList: vi.fn().mockResolvedValue({ data }),
    },
  } as never);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: "org_1" }));
});

describe("getOrganizationMembersDal", () => {
  it("returns nothing without an org", async () => {
    vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: null }));
    expect(await getOrganizationMembersDal()).toEqual([]);
  });

  it("uses the full name, then the identifier, then a placeholder", async () => {
    members([
      { publicUserData: { userId: "u1", firstName: "Sam", lastName: "Mower" } },
      { publicUserData: { userId: "u2", identifier: "alex@example.com" } },
      { publicUserData: { userId: "u3" } },
      { publicUserData: null },
    ]);
    expect(await getOrganizationMembersDal()).toEqual([
      { id: "u1", name: "Sam Mower" },
      { id: "u2", name: "alex@example.com" },
      { id: "u3", name: "Unknown Member" },
      { id: "", name: "Unknown Member" },
    ]);
  });

  it("returns an empty list when Clerk fails", async () => {
    vi.mocked(clerkClient).mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi
          .fn()
          .mockRejectedValue(new Error("x")),
      },
    } as never);
    expect(await getOrganizationMembersDal()).toEqual([]);
  });
});
