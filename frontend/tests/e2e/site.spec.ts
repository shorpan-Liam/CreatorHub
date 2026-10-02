import { test, expect } from '@playwright/test';
import type { Tool } from '../../src/client/types';

test('independent landing, section links, FAQ and mobile navigation', async ({
  page,
  isMobile,
}) => {
  const catalogRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/tools') catalogRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CreatorHub', exact: true })).toBeVisible();
  await expect(page.locator('.tool-repository')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '搜索工具' })).toHaveCount(0);
  await expect(page.locator('.landing-header')).toHaveCount(1);
  await page.getByRole('link', { name: '了解平台', exact: true }).click();
  await expect(page).toHaveURL(/\/#features$/);
  await expect(page.locator('#features')).toBeInViewport();
  const faq = page.locator('.landing-faq-item').first();
  await faq.getByRole('button').click();
  await expect(faq.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(faq.locator('p')).toBeVisible();
  await page.locator('.landing-faq-item').nth(1).getByRole('button').click();
  await expect(faq.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  const images = page.locator('.landing-preview-gallery img');
  await expect(images).toHaveCount(3);
  await images.first().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      images.evaluateAll((items) =>
        items.every(
          (item) =>
            (item as HTMLImageElement).complete && (item as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  expect(catalogRequests).toHaveLength(0);
  await page.locator('.landing-cta').getByRole('link', { name: '开始创作', exact: true }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.getByRole('heading', { name: '创作工具仓库' })).toBeInViewport();
  await expect(page.getByRole('textbox', { name: '搜索工具' })).toBeInViewport();
  await page.reload();
  await expect(page.getByRole('heading', { name: '创作工具仓库' })).toBeVisible();
  await page.getByRole('link', { name: 'CreatorHub 首页' }).click();
  if (isMobile) {
    await page.getByRole('button', { name: '打开导航' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.getByRole('button', { name: '打开导航' }).click();
    await page.getByRole('menuitem', { name: '工具仓库', exact: true }).click();
  } else {
    await page
      .getByRole('navigation', { name: '主导航' })
      .getByRole('link', { name: '工具仓库' })
      .click();
  }
  await expect(page).toHaveURL(/\/tools$/);
  await page.getByRole('link', { name: '打开文章转图片' }).click();
  await expect(page.getByLabel('标题', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '返回工具库' }).click();
  await expect(page).toHaveURL(/\/tools$/);
});

test('horizontal masonry cards keep gaps with varied future catalog content', async ({
  page,
  isMobile,
}) => {
  const tools: Tool[] = Array.from({ length: 9 }, (_, index) => ({
    slug: index ? `fixture-${index}` : 'article-to-images',
    name:
      index % 3 === 0
        ? '文章转图片'
        : index % 3 === 1
          ? '图片格式转换'
          : '较长的工具名称用于验证标题折行',
    description:
      index % 3 === 0
        ? ''
        : index % 3 === 1
          ? '将图片转换为另一种格式。'
          : '这是一段较长的说明，用来验证内容自然换行、卡片高度变化和工具之间的独立空隙。',
    category: 'graphic-content',
    platforms: ['xiaohongshu', 'douyin', 'zhihu'],
    keywords: [],
    status: index ? 'coming_soon' : 'available',
    route: '/tools/article-to-images',
    iconKey: 'article-images',
    sortOrder: index,
  }));
  await page.route('**/api/v1/tools', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: tools }),
    }),
  );
  await page.goto('/tools');
  const cards = page.locator('.repository-card');
  await expect(cards).toHaveCount(9);
  await expect(page.locator('.tool-waterfall')).toHaveCSS('column-count', isMobile ? '1' : '3');
  const rects = await cards.evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
  expect(new Set(rects.map((rect) => Math.round(rect.height))).size).toBeGreaterThan(1);
  for (const rect of rects) expect(rect.width).toBeGreaterThan(rect.height);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i],
        b = rects[j];
      const gap = Math.max(b.x - a.right, a.x - b.right, b.y - a.bottom, a.y - b.bottom);
      expect(gap).toBeGreaterThanOrEqual(15);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/masonry-fixtures-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: '收藏文章转图片', exact: true }).first().click();
  await expect(page).toHaveURL(/\/tools$/);
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await expect(cards).toHaveCount(1);
});

test('homepage and real card fit short, narrow and wide screens', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sizes = isMobile
    ? [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
      ]
    : [
        { width: 768, height: 1024 },
        { width: 1280, height: 720 },
        { width: 1920, height: 1080 },
      ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('.repository-card')).toHaveCount(0);
    const title = await page
      .getByRole('heading', { name: 'CreatorHub', exact: true })
      .boundingBox();
    const offer = await page.locator('.landing-offer').boundingBox();
    const controls = await page.locator('.landing-actions').boundingBox();
    const benefits = await page.locator('.landing-benefits').boundingBox();
    const strip = await page.locator('.landing-capability-strip').boundingBox();
    const hero = await page.locator('.landing-hero').boundingBox();
    expect(title!.x).toBeGreaterThanOrEqual(0);
    expect(title!.x + title!.width).toBeLessThanOrEqual(size.width);
    expect(title!.y + title!.height).toBeLessThanOrEqual(offer!.y);
    expect(offer!.y + offer!.height).toBeLessThanOrEqual(controls!.y);
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(benefits!.y);
    expect(benefits!.y + benefits!.height).toBeLessThanOrEqual(strip!.y);
    expect(strip!.y + strip!.height).toBeLessThanOrEqual(hero!.y + hero!.height);
    const notes = await page.locator('.landing-preview-gallery img').evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width };
      }),
    );
    for (const [index, note] of notes.entries()) {
      expect(note.y).toBeGreaterThanOrEqual(hero!.y + hero!.height);
      if (!isMobile || index === 0) {
        expect(note.x).toBeGreaterThanOrEqual(0);
        expect(note.x + note.width).toBeLessThanOrEqual(size.width);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/landing-${size.width}.png` });
    await page.goto('/tools');
    const card = await page.locator('.repository-card').boundingBox();
    expect(card!.width).toBeGreaterThan(card!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/repository-${size.width}.png` });
  }
});

test('warehouse navigation swaps one page without refresh or leftover landing content', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.locator('.landing-page')).toBeVisible();
  const header = await page.locator('.landing-header').elementHandle();
  const headerContent = await page.locator('.header-inner').textContent();
  const headerWidth = await page
    .locator('.header-inner')
    .evaluate((el) => el.getBoundingClientRect().width);
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  const documents: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documents.push(request.url());
  });
  for (let turn = 0; turn < 3; turn++) {
    await page.locator('.landing-cta').scrollIntoViewIfNeeded();
    if (isMobile) {
      await page.getByRole('button', { name: '打开导航' }).click();
      await page.getByRole('menuitem', { name: '工具仓库', exact: true }).click();
    } else {
      await page
        .getByRole('navigation', { name: '主导航' })
        .getByRole('link', { name: '工具仓库', exact: true })
        .click();
    }
    await expect(page).toHaveURL(/\/tools$/);
    await expect(page.locator('header')).toHaveCount(1);
    expect(await header!.evaluate((el) => el === document.querySelector('.landing-header'))).toBe(
      true,
    );
    // Only the active link state changes; the mounted navigation and its sizing stay intact.
    expect(
      await page.locator('.header-inner').evaluate((el) => el.getBoundingClientRect().width),
    ).toBe(headerWidth);
    await expect(page.locator('.header-inner')).toHaveCSS('height', '64px');
    if (!isMobile) {
      await expect(page.locator('header').getByRole('link', { name: '开始使用' })).toHaveCount(1);
      await expect(
        page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '工具仓库' }),
      ).toHaveAttribute('aria-current', 'page');
    }
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('.landing-page, .landing-footer')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '创作工具仓库' })).toBeInViewport();
    await expect(page.getByRole('textbox', { name: '搜索工具' })).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.goBack();
    await expect(page.locator('.landing-page')).toBeVisible();
    await expect(page.locator('.tool-repository')).toHaveCount(0);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(await page.locator('.header-inner').textContent()).toBe(headerContent);
    await page.goForward();
    await expect(page.getByRole('textbox', { name: '搜索工具' })).toBeInViewport();
    await page.getByRole('link', { name: 'CreatorHub 首页' }).click();
    await expect(page.locator('.landing-page')).toBeVisible();
  }
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  expect(documents).toHaveLength(0);
});

test('shared navigation returns from the warehouse to a landing section without refresh', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await expect(page.getByRole('heading', { name: '创作工具仓库' })).toBeVisible();
  const header = await page.locator('.landing-header').elementHandle();
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  if (isMobile) {
    await page.getByRole('button', { name: '打开导航' }).click();
    await page.getByRole('menuitem', { name: '平台功能', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
  } else {
    await page
      .getByRole('navigation', { name: '主导航' })
      .getByRole('link', { name: '平台功能', exact: true })
      .click();
  }
  await expect(page).toHaveURL(/\/#features$/);
  await expect(page.locator('#features')).toBeInViewport();
  expect(await header!.evaluate((el) => el === document.querySelector('.landing-header'))).toBe(
    true,
  );
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await page.goBack();
  await expect(page.getByRole('heading', { name: '创作工具仓库' })).toBeInViewport();
});
