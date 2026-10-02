import { test, expect, type Page } from '@playwright/test';

async function selectSection(page: Page, mobile: boolean, name: string) {
  if (mobile) {
    await page.getByRole('button', { name: '打开导航' }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  } else {
    await page
      .getByRole('navigation', { name: '主导航' })
      .getByRole('link', { name, exact: true })
      .click();
  }
}

test('header stays opaque and visually unchanged on every frame of repeated navigation', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/tools');
  await expect(page.getByLabel('搜索工具')).toBeVisible();
  await expect(page.locator('header nav a').first()).toHaveCSS('opacity', '1');
  await page.evaluate(() => {
    const header = document.querySelector('header')!;
    const samples: {
      connected: boolean;
      background: string;
      backdrop: string;
      height: number;
      opacity: number;
      moved: boolean;
    }[] = [];
    let frame = 0;
    const record = () => {
      const style = getComputedStyle(header);
      const links = Array.from(header.querySelectorAll('nav a')).map((el) => getComputedStyle(el));
      samples.push({
        connected: header.isConnected,
        background: style.backgroundColor,
        backdrop: style.backdropFilter,
        height: header.getBoundingClientRect().height,
        opacity: Math.min(Number(style.opacity), ...links.map((link) => Number(link.opacity))),
        moved: links.some((link) => link.transform !== 'none'),
      });
      frame = requestAnimationFrame(record);
    };
    record();
    Object.assign(window, {
      finishHeaderFrames: () => {
        cancelAnimationFrame(frame);
        return samples;
      },
    });
  });
  for (let turn = 0; turn < 2; turn++) {
    await selectSection(page, isMobile, '平台功能');
    await expect(page.locator('#features')).toBeInViewport();
    await expect(page.locator('header')).toHaveClass(/is-scrolled/);
    await selectSection(page, isMobile, '工具仓库');
    await expect(page.getByLabel('搜索工具')).toBeVisible();
    await page.locator('header').getByRole('link', { name: '本机设置', exact: true }).click();
    await expect(page.locator('.info-page')).toBeVisible();
    await page.goBack();
    await expect(page.getByLabel('搜索工具')).toBeVisible();
  }
  const frames = await page.evaluate(() =>
    (
      window as unknown as {
        finishHeaderFrames: () => {
          connected: boolean;
          background: string;
          backdrop: string;
          height: number;
          opacity: number;
          moved: boolean;
        }[];
      }
    ).finishHeaderFrames(),
  );
  expect(frames.length).toBeGreaterThan(5);
  expect(new Set(frames.map((frame) => frame.background)).size).toBe(1);
  for (const frame of frames) {
    expect(frame.connected).toBe(true);
    expect(frame.backdrop).toBe('none');
    expect(frame.opacity).toBe(1);
    expect(frame.moved).toBe(false);
    expect(frame.height).toBeCloseTo(64, 0);
  }
});

test('navigation preserves the content shell and header height without replaying a page fade', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('.landing-hero')).toBeVisible();
  const shell = await page.locator('.route-surface').elementHandle();
  const header = page.locator('.landing-header');
  await expect(header).toHaveCSS('height', '64px');
  await selectSection(page, isMobile, '平台功能');
  await expect(header).toHaveClass(/is-scrolled/);
  await expect(header).toHaveCSS('height', '64px');
  await selectSection(page, isMobile, '工具仓库');
  await expect(page.getByLabel('搜索工具')).toBeVisible();
  expect(
    await page.locator('header nav a[href="/#features"]').getAttribute('aria-current'),
  ).toBeNull();
  expect(await shell!.evaluate((el) => el === document.querySelector('.route-surface'))).toBe(true);
  await expect(page.locator('.route-surface')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.route-surface')).toHaveCSS('opacity', '1');
  await page.getByLabel('搜索工具').fill('测试保留搜索');
  await selectSection(page, isMobile, '工具仓库');
  await expect(page.getByLabel('搜索工具')).toHaveValue('测试保留搜索');
});

test('a slow lazy route keeps the previous content visible until it is ready', async ({ page }) => {
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route('**/assets/Landing-*.js', async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await page.goto('/tools');
  await expect(page.getByLabel('搜索工具')).toBeVisible();
  await page.getByRole('link', { name: 'CreatorHub 首页' }).click();
  await requestStarted;
  try {
    await expect(page.getByLabel('搜索工具')).toBeVisible({ timeout: 1500 });
    await expect(page.locator('.loading-page')).toHaveCount(0);
    await expect(page.locator('.landing-header')).toBeVisible();
  } finally {
    release();
  }
  await expect(page.locator('.landing-hero')).toBeVisible();
  await expect(page.locator('.tool-repository')).toHaveCount(0);
});

test('all header destinations and history work without document requests or runtime errors', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  const documents: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tools');
  await expect(page.getByLabel('搜索工具')).toBeVisible();
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documents.push(request.url());
  });
  for (const [name, id] of [
    ['平台功能', 'features'],
    ['创作流程', 'how-it-works'],
    ['常见问题', 'faq'],
  ]) {
    await selectSection(page, isMobile, name);
    await expect(page.locator(`#${id}`)).toBeInViewport();
    await selectSection(page, isMobile, '工具仓库');
    await expect(page.getByLabel('搜索工具')).toBeVisible();
  }
  const header = page.locator('.landing-header');
  if (!isMobile) {
    await header.getByRole('link', { name: '使用说明', exact: true }).click();
    await expect(page.getByRole('heading', { name: '使用说明', exact: true })).toBeVisible();
  }
  await header.getByRole('link', { name: '本机设置', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('.info-page')).toBeVisible();
  await page.goBack();
  await expect(page.locator('main')).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  expect(documents).toEqual([]);
  expect(errors).toEqual([]);
});
