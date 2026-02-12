import { expect, type Page } from '@playwright/test';

/**
 * Close first-run workspace modal if present and switch to orchestrator/grid view.
 * This makes perf/autonomy tests deterministic across clean environments.
 */
export async function ensureSwarmViewReady(page: Page): Promise<void> {
  const managerHeading = page.getByRole('heading', { name: 'WORKSPACE MANAGER' });
  const orchestratorButton = page.getByRole('button', { name: 'Orchestrator' }).first();

  const closeWorkspaceManager = async () => {
    if (!(await managerHeading.isVisible().catch(() => false))) return;

    const closeButton = page.locator('button:has(svg.lucide-x)').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      await page.mouse.click(8, 8);
    }
    await expect(managerHeading).toBeHidden({ timeout: 5000 });
  };

  const clickOrchestrator = async () => {
    await orchestratorButton.waitFor({ state: 'attached', timeout: 8000 });

    try {
      if (await orchestratorButton.isVisible().catch(() => false)) {
        await orchestratorButton.click({ timeout: 5000 });
        return;
      }
    } catch {
      // Fall through to JS click fallback below.
    }

    // Fallback for transient layout states where actionability checks are flaky.
    await orchestratorButton.evaluate((element) => {
      (element as HTMLElement).click();
    });
  };

  await page.waitForLoadState('domcontentloaded');

  for (let attempt = 0; attempt < 4; attempt++) {
    await closeWorkspaceManager();
    await clickOrchestrator();
    await page.waitForTimeout(300);
    await closeWorkspaceManager();

    if (await page.getByTestId('neural-grid').isVisible().catch(() => false)) {
      return;
    }
  }

  await expect(page.getByTestId('neural-grid')).toBeVisible({ timeout: 15000 });
}
