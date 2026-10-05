import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

const authFile = "tests/e2e/.auth/admin.json";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run the E2E tests`);
  return value;
}

setup.describe.configure({ mode: "serial" });

setup("configure Clerk testing token", async () => {
  // Lets the test browser past Clerk's bot protection.
  await clerkSetup();
});

setup("sign in as an org admin", async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: requireEnv("E2E_CLERK_USER_EMAIL"),
      password: requireEnv("E2E_CLERK_USER_PASSWORD"),
    },
  });

  // Make the test org active so org-scoped pages and data work.
  const orgId = requireEnv("E2E_CLERK_ORG_ID");
  await page.evaluate(async (organization) => {
    // biome-ignore lint/suspicious/noExplicitAny: Clerk is a browser global
    await (window as any).Clerk.setActive({ organization });
  }, orgId);

  await page.goto("/client-info-list");
  await expect(page.getByRole("button", { name: /add client/i })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
