import { expect, test } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_ID } from "./support/e2eAuthConstants";

/**
 * Full-stack checks (same Playwright config as auth-guard: API + web, synthetic JWT).
 *
 * | Manual smoke (first-hour guide) | This spec |
 * |----------------------------------|-----------|
 * | Open deployed web, log in        | Pre-minted JWT → synthetic session (no Supabase UI) |
 * | Profile shows email / user id    | JWT claims + `/profile` API |
 * | Things: create, edit, delete     | UI + `window.prompt` for rename |
 */
test.describe("full stack (profile + things)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("lattice-e2e-signed-out");
    });
  });

  test("profile shows user id and email from JWT and API", async ({ page }) => {
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText(E2E_USER_EMAIL)).toBeVisible();
    await expect(page.getByText(E2E_USER_ID)).toBeVisible();
  });

  test("things: create, rename, delete", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const name = `E2E Thing ${suffix}`;
    const renamed = `E2E Renamed ${suffix}`;

    await page.goto("/things");
    await expect(page.getByRole("heading", { name: "Things" })).toBeVisible();

    await page.getByPlaceholder("New thing name").fill(name);
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/things") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Create", exact: true }).click();
    const created = await createResponse;
    expect(created.ok(), await created.text()).toBeTruthy();

    const list = page.locator('[aria-label="things-list"]');
    await expect(list.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 });

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("prompt");
      void dialog.accept(renamed);
    });
    await page.getByRole("button", { name: "Edit" }).first().click();

    await expect(list.getByText(renamed, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(list.getByText(renamed, { exact: true })).not.toBeVisible();
  });
});
