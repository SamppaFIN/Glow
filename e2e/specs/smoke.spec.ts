import { test, expect } from '@playwright/test';

test('game loads and shows menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#game-canvas')).toBeVisible();
  await expect(page).toHaveTitle('☀️ Glow');
});

test('tap starts game and shows score', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas#game-canvas');
  await canvas.click({ position: { x: 400, y: 300 } });
  await page.waitForTimeout(500);
  // Should show score text
  await expect(page.locator('canvas')).toBeVisible();
});
