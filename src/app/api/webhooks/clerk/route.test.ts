import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rebalanceClientsForOrg } from "@/dal/rebalance";
import {
  handleOrganizationCreatedDal,
  handleUserCreatedDal,
} from "@/dal/webhooks";
import { POST } from "./route";

vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: vi.fn() }));
vi.mock("@/dal/rebalance", () => ({ rebalanceClientsForOrg: vi.fn() }));
vi.mock("@/dal/webhooks", () => ({
  handleUserCreatedDal: vi.fn(),
  handleOrganizationCreatedDal: vi.fn(),
}));

const request = {} as NextRequest;
const deliver = (type: string, data: Record<string, unknown>) =>
  vi.mocked(verifyWebhook).mockResolvedValue({ type, data } as never);

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/webhooks/clerk", () => {
  it("rejects requests with an invalid signature", async () => {
    vi.mocked(verifyWebhook).mockRejectedValue(new Error("bad signature"));
    const res = await POST(request);
    expect(res.status).toBe(401);
    expect(handleUserCreatedDal).not.toHaveBeenCalled();
  });

  it("stores new users with their full name and email", async () => {
    deliver("user.created", {
      id: "user_1",
      first_name: "Jane",
      last_name: "Doe",
      email_addresses: [{ email_address: "jane@example.com" }],
    });
    const res = await POST(request);
    expect(res.status).toBe(200);
    expect(handleUserCreatedDal).toHaveBeenCalledWith(
      "user_1",
      "Jane Doe",
      "jane@example.com",
    );
  });

  it("skips users without an email address", async () => {
    deliver("user.created", { id: "user_1", email_addresses: [] });
    expect((await POST(request)).status).toBe(200);
    expect(handleUserCreatedDal).not.toHaveBeenCalled();
  });

  it("stores new organizations", async () => {
    deliver("organization.created", { id: "org_1", name: "Green Co" });
    await POST(request);
    expect(handleOrganizationCreatedDal).toHaveBeenCalledWith(
      "org_1",
      "Green Co",
    );
  });

  it.each(["subscriptionItem.active", "subscriptionItem.ended"])(
    "%s rebalances the paying organization, not the subscription item",
    async (type) => {
      deliver(type, {
        id: "csi_123",
        status: "active",
        payer: { organization_id: "org_1", user_id: "user_1" },
      });
      expect((await POST(request)).status).toBe(200);
      expect(rebalanceClientsForOrg).toHaveBeenCalledTimes(1);
      expect(rebalanceClientsForOrg).toHaveBeenCalledWith("org_1");
    },
  );

  it("ignores subscriptions paid by a user instead of an organization", async () => {
    deliver("subscriptionItem.active", {
      id: "csi_123",
      payer: { user_id: "user_1" },
    });
    expect((await POST(request)).status).toBe(200);
    expect(rebalanceClientsForOrg).not.toHaveBeenCalled();
  });

  it("still returns 200 when handling the event throws", async () => {
    deliver("organization.created", { id: "org_1", name: "Green Co" });
    vi.mocked(handleOrganizationCreatedDal).mockRejectedValue(new Error("db"));
    expect((await POST(request)).status).toBe(200);
  });
});
