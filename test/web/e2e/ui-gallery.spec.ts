import { expect, test } from "@playwright/test";

test("UI gallery lists component sections", async ({ page }) => {
  await page.goto("/ui");
  await expect(
    page.getByRole("heading", { name: "Component gallery" }),
  ).toBeVisible();
  await expect(page.getByTestId("ui-section-buttons")).toBeVisible();
  await expect(page.getByTestId("ui-section-badges")).toBeVisible();
  await expect(page.getByTestId("ui-section-form")).toBeVisible();
  await expect(page.getByTestId("ui-section-cards")).toBeVisible();
  await expect(page.getByTestId("ui-section-alerts")).toBeVisible();
});
