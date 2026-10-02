import { test, expect } from '@playwright/test';

test('marquee moves, pauses, resumes and stops for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const strip = page.locator('.landing-capability-strip');
  const track = page.locator('.landing-marquee-track').first();
  await strip.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(strip).toHaveAttribute('data-paused', 'false');
  const first = await track.evaluate((el) => getComputedStyle(el).transform);
  await expect.poll(() => track.evaluate((el) => getComputedStyle(el).transform)).not.toBe(first);
  await page.getByRole('button', { name: '暂停创作能力展示', exact: true }).click();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await expect(page.getByRole('button', { name: '播放创作能力展示', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '播放创作能力展示', exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(track).toHaveCSS('animation-play-state', 'running');
  await strip.hover();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: '暂停创作能力展示', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '了解平台', exact: true }).click();
  await expect(page.locator('.landing-feature').first()).toBeVisible();
  await expect(strip).toHaveAttribute('data-paused', 'true');
});

test('scroll reveal, active navigation, animated FAQ and image viewer', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const reveal = page.locator('.landing-feature-grid [data-landing-reveal]').first();
  await expect(reveal).toHaveCSS('opacity', '0');
  await page.getByRole('link', { name: '了解平台', exact: true }).click();
  await expect(reveal).toHaveCSS('opacity', '1');
  await expect(page.locator('.landing-header')).toHaveClass(/is-scrolled/);
  if (!isMobile)
    await expect(
      page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '平台功能' }),
    ).toHaveAttribute('aria-current', 'location');
  const faq = page.locator('.landing-faq-trigger').first();
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.landing-faq-content').first()).toHaveCSS(
    'animation-name',
    'landing-accordion-down',
  );
  await faq.press('ArrowDown');
  await expect(page.locator('.landing-faq-trigger').nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('aria-expanded', 'false');
  const sample = page.getByRole('button', { name: '查看清晰的文字排版', exact: true });
  await sample.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '清晰的文字排版' })).toBeVisible();
  await expect
    .poll(() => dialog.locator('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await dialog.getByRole('button', { name: '下一张样例' }).click();
  await expect(dialog.getByRole('heading', { name: '一致的个人风格' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('heading', { name: '清晰的文字排版' })).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.width + bounds!.x).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.height + bounds!.y).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(sample).toBeFocused();
  if (isMobile) {
    await expect(page.locator('.landing-preview-gallery')).toHaveCSS(
      'scroll-snap-type',
      'x mandatory',
    );
    await page.getByRole('button', { name: '查看恰到好处的留白' }).click();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: '恰到好处的留白' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('layout grows with content, window size and text zoom', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sizes = isMobile
    ? [
        { width: 320, height: 568 },
        { width: 844, height: 390 },
      ]
    : [
        { width: 900, height: 620 },
        { width: 1536, height: 864 },
        { width: 2560, height: 1440 },
      ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'CreatorHub', exact: true })).toBeVisible();
    const hero = await page.locator('.landing-hero').boundingBox();
    const benefits = await page.locator('.landing-benefits').boundingBox();
    expect(benefits!.y + benefits!.height).toBeLessThanOrEqual(hero!.y + hero!.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const nav = await page.locator('.header-inner').evaluate((el) =>
      Array.from(el.children)
        .filter((item) => getComputedStyle(item).display !== 'none')
        .map((item) => {
          const r = item.getBoundingClientRect();
          return { left: r.left, right: r.right };
        }),
    );
    for (let i = 1; i < nav.length; i++)
      expect(nav[i].left).toBeGreaterThanOrEqual(nav[i - 1].right);
  }
  // Text zoom must enlarge the flow rather than clip a fixed-height hero.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.addStyleTag({ content: '.landing-offer { font-size: 26px !important; }' });
  const hero = await page.locator('.landing-hero').boundingBox();
  const strip = await page.locator('.landing-capability-strip').boundingBox();
  expect(strip!.y + strip!.height).toBeLessThanOrEqual(hero!.y + hero!.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
