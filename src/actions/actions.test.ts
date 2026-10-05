import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { err, ok } from "neverthrow";
import { updateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as clientsDal from "@/dal/clients";
import * as invoicesDal from "@/dal/invoices";
import * as serviceDal from "@/dal/service";
import * as sitemapDal from "@/dal/sitemap";
import { mockAuth } from "../../tests/helpers/clerk";
import { upsertAssignmentAction } from "./assignments";
import {
  createClientAction,
  deleteClientAction,
  updateAddressAssigneeAction,
  updateClientAction,
} from "./clients";
import {
  createInvoiceAction,
  deleteInvoiceWithOrgAction,
  sendInvoiceEmailAction,
  updateInvoiceStatusAction,
} from "./invoices";
import { completeJobAction } from "./jobs";
import {
  deleteOneTimeServiceAction,
  insertOneTimeServiceAction,
} from "./one-time";
import { updateRouteOrderAction } from "./routes";
import { deleteScheduleAction, upsertScheduleAction } from "./schedules";
import {
  deleteSiteMapAction,
  saveSiteMapAction,
  updateSiteMapAction,
} from "./sitemaps";

vi.mock("@clerk/nextjs/server", () => ({ auth: { protect: vi.fn() } }));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: vi.fn() }));
vi.mock("@/dal/clients", () => ({
  createClientDal: vi.fn(),
  updateClientDal: vi.fn(),
  deleteClientDal: vi.fn(),
}));
vi.mock("@/dal/invoices", () => ({
  createInvoiceDal: vi.fn(),
  deleteInvoiceDal: vi.fn(),
  sendInvoiceEmailDal: vi.fn(),
  updateInvoiceStatusDal: vi.fn(),
}));
vi.mock("@/dal/service", () => ({
  completeJobDal: vi.fn(),
  deleteOneTimeServiceDal: vi.fn(),
  deleteScheduleDal: vi.fn(),
  insertOneTimeServiceDal: vi.fn(),
  updateAddressAssigneeDal: vi.fn(),
  updateRouteOrderDal: vi.fn(),
  upsertAssignmentDal: vi.fn(),
  upsertScheduleDal: vi.fn(),
}));
vi.mock("@/dal/sitemap", () => ({
  deleteSiteMapDal: vi.fn(),
  saveSiteMapDal: vi.fn(),
  updateSiteMapDal: vi.fn(),
}));

const ORG = "org_a";
const row = { id: "row_1", org_id: ORG };

const tags = () => vi.mocked(updateTag).mock.calls.map(([tag]) => tag);

function formData(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

beforeEach(() => {
  vi.mocked(auth.protect).mockResolvedValue(mockAuth({ orgId: ORG }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/**
 * Every action follows the same pattern: call the DAL, and on success clear
 * the cache tags for the affected org. Each case lists the DAL function to
 * stub, how to call the action, and the exact tags it must clear.
 */
type Case = {
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: each DAL has its own signature
  dal: any;
  run: () => Promise<{ success: boolean; error: string | null }>;
  tags: string[];
};

const cases: Case[] = [
  {
    name: "createClientAction",
    dal: clientsDal.createClientDal,
    run: () =>
      createClientAction({ name: "Jane", addresses: [] } as never) as never,
    tags: [
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "updateClientAction",
    dal: clientsDal.updateClientDal,
    run: () => updateClientAction("c1", { name: "Jane", addresses: [] }),
    tags: [
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "deleteClientAction",
    dal: clientsDal.deleteClientDal,
    run: () => deleteClientAction("c1"),
    tags: [
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `job-history-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "updateAddressAssigneeAction",
    dal: serviceDal.updateAddressAssigneeDal,
    run: () => updateAddressAssigneeAction("a1", ["user_1"]),
    tags: [
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `addresses-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "upsertAssignmentAction",
    dal: serviceDal.upsertAssignmentDal,
    run: () => upsertAssignmentAction("a1", "user_1", "2026-06-01"),
    tags: [
      `assignments-${ORG}`,
      `assignments-${ORG}-2026-06-01`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "createInvoiceAction",
    dal: invoicesDal.createInvoiceDal,
    run: () => createInvoiceAction({} as never),
    tags: [`invoices-${ORG}`, `invoices-revenue-${ORG}`],
  },
  {
    name: "updateInvoiceStatusAction",
    dal: invoicesDal.updateInvoiceStatusDal,
    run: () => updateInvoiceStatusAction("row_1", "paid"),
    tags: [
      `invoices-${ORG}`,
      "invoice-detail-row_1",
      `invoices-revenue-${ORG}`,
    ],
  },
  {
    name: "deleteInvoiceWithOrgAction",
    dal: invoicesDal.deleteInvoiceDal,
    run: () => deleteInvoiceWithOrgAction("row_1"),
    tags: [
      `invoices-${ORG}`,
      `invoices-revenue-${ORG}`,
      "invoice-detail-row_1",
    ],
  },
  {
    name: "sendInvoiceEmailAction",
    dal: invoicesDal.sendInvoiceEmailDal,
    run: () => sendInvoiceEmailAction("row_1"),
    tags: [`invoices-${ORG}`, "invoice-detail-row_1"],
  },
  {
    name: "insertOneTimeServiceAction",
    dal: serviceDal.insertOneTimeServiceDal,
    run: () =>
      insertOneTimeServiceAction("a1", "Aeration", "other", "2026-06-01"),
    tags: [
      `schedules-${ORG}`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "deleteOneTimeServiceAction",
    dal: serviceDal.deleteOneTimeServiceDal,
    run: () => deleteOneTimeServiceAction("s1"),
    tags: [
      `schedules-${ORG}`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "updateRouteOrderAction",
    dal: serviceDal.updateRouteOrderDal,
    run: () => updateRouteOrderAction("a1", 2),
    tags: [
      `route-order-${ORG}`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
    ],
  },
  {
    name: "upsertScheduleAction",
    dal: serviceDal.upsertScheduleDal,
    run: () => upsertScheduleAction("a1", "weekly", "2026-06-01"),
    tags: [
      `schedules-${ORG}`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "deleteScheduleAction",
    dal: serviceDal.deleteScheduleDal,
    run: () => deleteScheduleAction("a1"),
    tags: [
      `schedules-${ORG}`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `clients-search-${ORG}`,
    ],
  },
  {
    name: "updateSiteMapAction",
    dal: sitemapDal.updateSiteMapDal,
    run: () => updateSiteMapAction(formData({ siteMapId: "m1" })),
    tags: [`sitemaps-${ORG}`, `clients-info-${ORG}`, `clients-cutlist-${ORG}`],
  },
  {
    name: "deleteSiteMapAction",
    dal: sitemapDal.deleteSiteMapDal,
    run: () => deleteSiteMapAction("m1"),
    tags: [`sitemaps-${ORG}`, `clients-info-${ORG}`, `clients-cutlist-${ORG}`],
  },
];

describe.each(cases)("$name", ({ dal, run, tags: expected }) => {
  it("clears the org's cache tags on success", async () => {
    vi.mocked(dal).mockResolvedValue(ok(row));
    const result = await run();
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(tags()).toEqual(expected);
  });

  it("returns the DAL's error and clears nothing on failure", async () => {
    vi.mocked(dal).mockResolvedValue(err({ reason: "Nope" }));
    const result = await run();
    expect(result).toMatchObject({ success: false, error: "Nope" });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("completeJobAction", () => {
  beforeEach(() => {
    vi.mocked(serviceDal.completeJobDal).mockResolvedValue(ok(row) as never);
  });

  it("parses the form and passes every field to the DAL", async () => {
    await completeJobAction(
      formData({
        addressId: "a1",
        serviceType: "grass",
        assignedMemberIds: JSON.stringify(["user_1", "user_2"]),
        notes: "Gate code 1234",
        capturedAt: "2026-06-01T15:00:00.000Z",
        completedAt: "2026-06-01T15:05:00.000Z",
        scheduledDate: "2026-06-01T06:00:00.000Z",
        oneTimeServiceId: "s1",
      }),
    );
    expect(serviceDal.completeJobDal).toHaveBeenCalledWith(
      "a1",
      "grass",
      ["user_1", "user_2"],
      "Gate code 1234",
      null,
      new Date("2026-06-01T15:00:00.000Z"),
      new Date("2026-06-01T15:05:00.000Z"),
      new Date("2026-06-01T06:00:00.000Z"),
      "s1",
    );
  });

  it("uses nulls for missing optional fields", async () => {
    await completeJobAction(formData({ addressId: "a1", serviceType: "snow" }));
    expect(serviceDal.completeJobDal).toHaveBeenCalledWith(
      "a1",
      "snow",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    );
    expect(put).not.toHaveBeenCalled();
  });

  it("uploads the photo privately and stores its URL", async () => {
    vi.mocked(put).mockResolvedValue({
      url: "https://blob.example/completion-a1.jpg",
    } as never);
    const photo = new File(["img"], "IMG_0001.jpg", { type: "image/jpeg" });

    await completeJobAction(
      formData({ addressId: "a1", serviceType: "grass", photoFile: photo }),
    );

    const [name, , options] = vi.mocked(put).mock.calls[0];
    expect(name).toMatch(/^completion-a1-\d+\.jpg$/);
    expect(options).toEqual({ access: "private" });
    expect(vi.mocked(serviceDal.completeJobDal).mock.calls[0][4]).toBe(
      "https://blob.example/completion-a1.jpg",
    );
  });

  it("still completes the job when the photo upload fails", async () => {
    vi.mocked(put).mockRejectedValue(new Error("blob down"));
    const photo = new File(["img"], "a.png", { type: "image/png" });

    const result = await completeJobAction(
      formData({ addressId: "a1", serviceType: "grass", photoFile: photo }),
    );

    expect(result.success).toBe(true);
    expect(vi.mocked(serviceDal.completeJobDal).mock.calls[0][4]).toBeNull();
  });

  it("clears the history tags for the completed and scheduled days", async () => {
    await completeJobAction(
      formData({
        addressId: "a1",
        serviceType: "grass",
        // Local (America/Edmonton) dates, not UTC dates, name the tags.
        completedAt: "2026-06-02T03:00:00.000Z", // Jun 1, 9pm local
        scheduledDate: "2026-05-31T06:00:00.000Z", // May 31, midnight local
      }),
    );
    expect(tags()).toEqual([
      `job-history-${ORG}`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
      `job-history-${ORG}-2026-06-01`,
      `job-history-${ORG}-2026-05-31`,
    ]);
  });

  it("returns the DAL's error and clears nothing on failure", async () => {
    vi.mocked(serviceDal.completeJobDal).mockResolvedValue(
      err({ reason: "Address not found" }) as never,
    );
    const result = await completeJobAction(
      formData({ addressId: "a1", serviceType: "grass" }),
    );
    expect(result).toEqual({
      success: false,
      job: null,
      error: "Address not found",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("saveSiteMapAction", () => {
  beforeEach(() => {
    vi.mocked(sitemapDal.saveSiteMapDal).mockResolvedValue(ok(row) as never);
  });

  it("rejects files over 1MB without uploading", async () => {
    const big = new File([new Uint8Array(1024 * 1024 + 1)], "map.png");
    const result = await saveSiteMapAction(
      formData({ addressId: "a1", file: big }),
    );
    expect(result).toEqual({
      success: false,
      siteMap: null,
      error: "File size exceeds 1MB limit",
    });
    expect(put).not.toHaveBeenCalled();
    expect(sitemapDal.saveSiteMapDal).not.toHaveBeenCalled();
  });

  it("uploads with a sanitized file name and saves the parsed map data", async () => {
    vi.mocked(put).mockResolvedValue({
      url: "https://blob.example/sitemap.png",
    } as never);
    const file = new File(["x"], "../my map (1).png");

    const result = await saveSiteMapAction(
      formData({
        addressId: "a1",
        name: "Front yard",
        notes: "Dog",
        mapData: JSON.stringify({ shapes: [1] }),
        file,
      }),
    );

    expect(result.success).toBe(true);
    const [name, , options] = vi.mocked(put).mock.calls[0];
    expect(name).toMatch(/^sitemap-a1-\d+-\.\._my_map__1_\.png$/);
    expect(name).not.toContain("/");
    expect(options).toEqual({ access: "private" });
    expect(sitemapDal.saveSiteMapDal).toHaveBeenCalledWith(
      "a1",
      "Front yard",
      "Dog",
      "https://blob.example/sitemap.png",
      { shapes: [1] },
    );
    expect(tags()).toEqual([
      `sitemaps-${ORG}`,
      `clients-info-${ORG}`,
      `clients-cutlist-${ORG}`,
    ]);
  });

  it("returns an error and saves nothing when the upload fails", async () => {
    vi.mocked(put).mockRejectedValue(new Error("blob down"));
    const result = await saveSiteMapAction(
      formData({ addressId: "a1", file: new File(["x"], "map.png") }),
    );
    expect(result).toEqual({
      success: false,
      siteMap: null,
      error: "Failed to upload to storage",
    });
    expect(sitemapDal.saveSiteMapDal).not.toHaveBeenCalled();
  });

  it("saves a drawn map with no file", async () => {
    await saveSiteMapAction(formData({ addressId: "a1" }));
    expect(put).not.toHaveBeenCalled();
    expect(sitemapDal.saveSiteMapDal).toHaveBeenCalledWith(
      "a1",
      null,
      null,
      null,
      null,
    );
  });

  it("returns the DAL's error and clears nothing on failure", async () => {
    vi.mocked(sitemapDal.saveSiteMapDal).mockResolvedValue(
      err({ reason: "Address not found" }) as never,
    );
    const result = await saveSiteMapAction(formData({ addressId: "a1" }));
    expect(result).toEqual({
      success: false,
      siteMap: null,
      error: "Address not found",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
