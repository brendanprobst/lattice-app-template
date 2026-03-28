import { expect, test } from "@playwright/test";

test("unauthenticated users are redirected to login for protected routes", async ({ page }) => {
  await page.goto("/things");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
