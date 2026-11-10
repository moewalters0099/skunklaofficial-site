const { test, expect } = require('@playwright/test');
const { resolve } = require('node:path');
const url = 'file://' + resolve(__dirname, '../prototypes/catalog-layout.html');

test('gallery filters, search, reset, and empty state', async ({ page }) => {
  await page.goto(url);
  await expect(page.locator('.tile:visible')).toHaveCount(12);
  await page.getByRole('button', { name: 'Graphics' }).click();
  await expect(page.locator('.tile:visible')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Graphics' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('searchbox', { name: 'Search design concepts' }).fill('study 06');
  await expect(page.locator('.tile:visible')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search design concepts' }).fill('no-such-concept');
  await expect(page.locator('.tile:visible')).toHaveCount(0);
  await expect(page.locator('#empty-state')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.tile:visible')).toHaveCount(12);
  await expect(page.getByRole('searchbox', { name: 'Search design concepts' })).toHaveValue('');
});

for (const width of [375, 768, 1440]) {
  test('layout has no horizontal overflow at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await expect(page.locator('.tile:visible')).toHaveCount(12);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}

for (const width of [375, 768, 1440]) {
  test('capture design review screenshot at ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await expect(page.locator('.tile:visible')).toHaveCount(12);
    await page.screenshot({
      path: testInfo.outputPath('catalog-' + width + 'px.png'),
      fullPage: true,
    });
  });
}

test('keyboard navigation and brand image load', async ({ page }) => {
  await page.goto(url);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to gallery' })).toBeFocused();
  const logo = page.locator('.prototype-logo img');
  await expect(logo).toBeVisible();
  const loaded = await logo.evaluate(img => img.complete && img.naturalWidth > 0);
  expect(loaded).toBe(true);
  await page.getByRole('button', { name: 'Editorial' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tile:visible')).toHaveCount(3);
});

test('reset returns gallery after empty results', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('searchbox', { name: 'Search design concepts' }).fill('nothing matches this phrase');
  await expect(page.locator('#empty-state')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('#empty-state')).toBeHidden();
  await expect(page.locator('.tile:visible')).toHaveCount(12);
});
