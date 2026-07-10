import { expect, test } from '@playwright/test';

const mockReport = {
  repo: 'owner/repo',
  overall: { score: 88, grade: 'B' },
  layers: [
    {
      id: 'frontend',
      label: 'Frontend',
      score: 88,
      grade: 'B',
      checks: [
        {
          id: 'secrets',
          label: 'Exposed secrets',
          status: 'pass',
          confidence: 'verified',
          severity: 'critical',
          findings: [],
        },
      ],
    },
  ],
};

test('submits a repo and renders the scorecard', async ({ page }) => {
  await page.route('**/api/scan', async (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.postDataJSON()).toEqual({ repoUrl: 'owner/repo' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockReport),
    });
  });

  await page.goto('/');
  await page.getByPlaceholder(/github\.com\/owner\/repo/i).fill('owner/repo');
  await page.getByRole('button', { name: /scan repo/i }).click();

  await expect(page.getByText('Overall')).toBeVisible();
  await expect(page.getByText('Grade B').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frontend' })).toBeVisible();
  await expect(page.getByText('Exposed secrets')).toBeVisible();
});
