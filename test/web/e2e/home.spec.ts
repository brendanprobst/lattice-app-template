import { expect, test } from "@playwright/test";

import { HOME_LANDING_HERO_TITLE } from "../../../apps/web/client/pages/home/homeLanding";

test("home shows Lattice hero and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: HOME_LANDING_HERO_TITLE }),
  ).toBeVisible();
  await expect(page.getByText("NEXT_PUBLIC_API_URL")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /UI component gallery/i }),
  ).toBeVisible();
});
