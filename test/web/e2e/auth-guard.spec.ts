import { expect, test } from "@playwright/test";

/**
 * Do not use `page.addInitScript` to clear `lattice-e2e-signed-out` here — Playwright runs
 * init scripts before every document load (including `reload`), which would erase the flag
 * we set to simulate sign-out.
 */
test("protected routes redirect to login when there is no session", async ({ page }) => {
  await page.goto("/things");
  await expect(page.getByRole("heading", { name: "Things" })).toBeVisible();

  await page.evaluate(() => {
    sessionStorage.setItem("lattice-e2e-signed-out", "1");
  });
  await page.reload();
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

  await page.goto("/things");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
