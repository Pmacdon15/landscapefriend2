import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

// Calgary's local date, matching the browser's timezoneId.
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/Edmonton",
});

test("add a client, schedule them, complete the cut and invoice it", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });

  // Unique per run so repeated runs against the same database don't collide.
  const runId = Date.now().toString(36);
  const clientName = `E2E Client ${runId}`;
  const street = `${runId} E2E Street`;

  await test.step("add a client", async () => {
    await page.goto("/client-info-list");
    await page.getByRole("button", { name: /add client/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill(clientName);
    await dialog.getByLabel("Street").fill(street);
    await dialog.getByLabel("City").fill("Calgary");
    await dialog.getByRole("button", { name: "Save Client" }).click();

    await expect(page).toHaveURL(/clientId=/);
    await expect(page.getByText(clientName).first()).toBeVisible();
  });

  await test.step("schedule a weekly cut starting today", async () => {
    await page.getByRole("button", { name: "Schedule" }).first().click();
    await page.getByRole("button", { name: "Save Schedule" }).click();
    await expect(page.getByText("Schedule updated")).toBeVisible();
    await expect(page.getByText("No schedule set")).toHaveCount(0);
  });

  await test.step("the client is on today's cut list", async () => {
    // Search narrows the route to this run's client.
    const search = encodeURIComponent(clientName);
    await page.goto(`/clients-service?date=${today}&search=${search}`);
    await expect(page.getByText(clientName).first()).toBeVisible();
    await expect(page.getByText(street).first()).toBeVisible();
  });

  await test.step("complete the job with a photo", async () => {
    await page
      .getByRole("button", { name: /mark complete/i })
      .first()
      .click();
    await page.getByRole("button", { name: "Take photo" }).click();
    await page.getByRole("button", { name: "Use photo" }).click();
    await expect(page.getByText("Job completed")).toBeVisible();
  });

  await test.step("create an invoice for the client", async () => {
    await page.goto("/admin/invoices");
    await page.getByRole("button", { name: "Create Invoice" }).click();

    const form = page.locator("form").filter({ hasText: "Client Selection" });
    await form.getByLabel("Client Selection").fill(clientName);
    await form.getByRole("button", { name: new RegExp(clientName) }).click();
    await expect(form.getByText("Selected Client:")).toBeVisible();

    await form.getByRole("button", { name: "Create Invoice" }).click();
    await expect(
      page.getByText(/Invoice .* created successfully/),
    ).toBeVisible();
  });
});
