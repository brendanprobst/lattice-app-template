import { expect, test } from '@playwright/test';

test('home page shows API base URL from env', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('API base URL')).toBeVisible();
  await expect(page.getByText('http://127.0.0.1:3000')).toBeVisible();
});
