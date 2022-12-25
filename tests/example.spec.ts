import { test, expect } from '@playwright/test';

test.beforeEach(async({page}) => {
  await page.goto('/');
})

test('Initialization', async ({ page }) => {
  await expect(page.getByText('Jotai-minidb example app')).toBeVisible()
});
