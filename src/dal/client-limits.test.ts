import { auth, clerkClient } from "@clerk/nextjs/server";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "@/db/client";
import { checkOrgMemberLimit } from "@/db/queries/clerk";
import { checkClientLimit, insertClientDb } from "@/db/queries/clients";
import { mockAuth } from "../../tests/helpers/clerk";
import { createClientDal } from "./clients";
import { rebalanceClientsForOrg } from "./rebalance";

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: vi.fn() },
  clerkClient: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/db/queries/clerk", () => ({ checkOrgMemberLimit: vi.fn() }));
vi.mock("@/db/queries/clients", () => ({
  checkClientLimit: vi.fn(),
  insertClientDb: vi.fn(),
  insertAddressDb: vi.fn(),
}));
vi.mock("./clerk", () => ({ getOrganizationMembersDal: vi.fn() }));

const validClient = {
  name: "Jane Doe",
  email: null,
  phone: null,
  addresses: [
    { street: "1 Main St", city: "Calgary", status: "active" as const },
  ],
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.mocked(checkOrgMemberLimit).mockResolvedValue(okAsync(undefined));
  vi.mocked(checkClientLimit).mockResolvedValue(okAsync(undefined) as never);
  vi.mocked(insertClientDb).mockResolvedValue({
    id: "c1",
    org_id: "org_1",
    name: "Jane Doe",
  } as never);
});

describe("createClientDal plan limit", () => {
  it.each([
    [[], 50],
    [["100_clients"], 100],
    [["200_clients"], 200],
    [["100_clients", "200_clients"], 200],
  ])("features %j allow %i active clients", async (features, limit) => {
    vi.mocked(auth.protect).mockResolvedValue(
      mockAuth({ orgId: "org_1", orgRole: "org:admin", features }),
    );

    await createClientDal(validClient);

    expect(checkClientLimit).toHaveBeenCalledWith("org_1", limit);
  });
});

describe("rebalanceClientsForOrg plan limit", () => {
  function mockClerk({
    features = [] as string[],
    subscription = null as unknown,
    members = 1,
    maxMembers = 5 as number | null,
  } = {}) {
    vi.mocked(clerkClient).mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({
          data: Array.from({ length: members }, () => ({})),
        }),
        getOrganization: vi.fn().mockResolvedValue({
          maxAllowedMemberships: maxMembers,
          publicMetadata: { features },
        }),
      },
      billing: {
        getOrganizationBillingSubscription: vi
          .fn()
          .mockResolvedValue(subscription),
      },
    } as never);
  }

  beforeEach(() => {
    vi.mocked(sql).mockResolvedValue([] as never);
  });

  it.each([
    [[], 50],
    [["100_clients"], 100],
    [["100-clients"], 100],
    [["200_clients"], 200],
    [["200-clients"], 200],
  ])("org features %j allow %i active clients", async (features, limit) => {
    mockClerk({ features });
    expect((await rebalanceClientsForOrg("org_1")).limit).toBe(limit);
  });

  it("reads the tier from the billing subscription", async () => {
    mockClerk({
      subscription: {
        items: [{ plan: { features: [{ slug: "200_clients" }] } }],
      },
    });
    expect((await rebalanceClientsForOrg("org_1")).limit).toBe(200);
  });

  it("disables every client when the org is over its member limit", async () => {
    mockClerk({ members: 6, maxMembers: 5 });
    expect((await rebalanceClientsForOrg("org_1")).limit).toBe(0);
  });

  it("keeps the oldest clients active and disables the rest", async () => {
    mockClerk();
    const clients = Array.from({ length: 52 }, (_, i) => ({
      id: `c${i}`,
      status: i === 0 ? "disabled" : "active",
    }));
    vi.mocked(sql).mockImplementation(((strings: TemplateStringsArray) =>
      Promise.resolve(
        strings.join("").includes("SELECT") ? clients : [],
      )) as never);

    const result = await rebalanceClientsForOrg("org_1");

    expect(result).toMatchObject({
      success: true,
      limit: 50,
      totalClients: 52,
      activatedCount: 1,
      disabledCount: 2,
    });
  });
});
