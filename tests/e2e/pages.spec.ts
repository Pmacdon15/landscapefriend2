import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

// Every page in src/app, visited as the signed-in admin. A page passes when
// it responds OK, has its title (and heading, when it has one) and throws no
// errors in the browser.
const pages: { path: string; title: RegExp; heading?: string | RegExp }[] = [
  { path: "/", title: /Landscape Friend/, heading: /run your landscaping/i },
  { path: "/pricing", title: /^Pricing \|/ },
  { path: "/privacy", title: /^Privacy Policy \|/ },
  { path: "/terms", title: /^Terms of Service \|/ },
  { path: "/client-info-list", title: /^Client Roster/, heading: "Clients" },
  {
    path: "/clients-service",
    title: /^Daily Service Routes/,
    heading: "Daily Service List",
  },
  { path: "/admin/history", title: /^Service History/, heading: "History" },
  {
    path: "/admin/invoices",
    title: /^Invoices/,
    heading: "Invoices & Billing",
  },
  { path: "/admin/stats", title: /^Service Statistics/, heading: "Analytics" },
];

for (const { path, title, heading } of pages) {
  test(`${path} loads without errors`, async ({ page }) => {
    await setupClerkTestingToken({ page });

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto(path);
    expect(response?.status(), `HTTP status for ${path}`).toBeLessThan(400);

    await expect(page).toHaveTitle(title);
    if (heading) {
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
    }

    // Next.js renders this when a server component throws.
    await expect(page.getByText(/application error/i)).toHaveCount(0);
    expect(errors, `browser errors on ${path}`).toEqual([]);
  });
}
