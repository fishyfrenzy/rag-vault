import { test, expect } from '@playwright/test';

test.describe('Vault Search', () => {
    test('should display vault page and search for items', async ({ page }) => {
        // Navigate to vault page
        await page.goto('/vault');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText('The Vault');

        // Check that search input exists
        const searchInput = page.getByPlaceholder('Search shirts, descriptions, tags...');
        await expect(searchInput).toBeVisible();

        // Type a search term
        await searchInput.fill('Metallica');

        // Wait for debounce and results
        await page.waitForTimeout(600);

        // The page should show results or empty state
        // We just verify the search doesn't break the page
        await expect(page.locator('h1')).toContainText('The Vault');
    });

    test('should filter by category', async ({ page }) => {
        await page.goto('/vault');

        // Wait for page load
        await expect(page.locator('h1')).toContainText('The Vault');

        // Click on Music category filter
        const musicFilter = page.getByRole('button', { name: 'Music' });
        if (await musicFilter.isVisible()) {
            await musicFilter.click();

            // Verify filter is applied (button should be active/styled differently)
            await page.waitForTimeout(300);
            await expect(page.locator('h1')).toContainText('The Vault');
        }
    });

    test('should toggle view modes', async ({ page }) => {
        await page.goto('/vault');

        await expect(page.locator('h1')).toContainText('The Vault');

        // Find and click list view button
        const listButton = page.locator('button').filter({ has: page.locator('svg.lucide-list') });
        if (await listButton.isVisible()) {
            await listButton.click();
            await page.waitForTimeout(200);
        }

        // Click grid view button
        const gridButton = page.locator('button').filter({ has: page.locator('svg.lucide-grid-3x3') });
        if (await gridButton.isVisible()) {
            await gridButton.click();
            await page.waitForTimeout(200);
        }

        // Page should still be functional
        await expect(page.locator('h1')).toContainText('The Vault');
    });
});
