import { test, expect } from '@playwright/test';

test('homepage uses TweakCN container, spacing and breakpoint geometry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [390, 639, 640, 767, 768, 1023, 1024, 1279, 1280, 1535, 1536, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.landing-hero')).toBeVisible();
    const measurements = await page.evaluate(() => {
      const hero = document.querySelector('.landing-hero')!;
      const container = hero.querySelector('.landing-container')!;
      const features = document.querySelector('.landing-feature-grid')!;
      const style = (el: Element) => getComputedStyle(el);
      const text = hero.querySelector('.landing-headline-category')!.firstChild!;
      const lineTops = Array.from(text.textContent!, (_, index) => {
        const range = document.createRange();
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        return Math.round(range.getBoundingClientRect().top);
      });
      return {
        available: document.querySelector('.tweak-home')!.getBoundingClientRect().width,
        width: container.getBoundingClientRect().width,
        sectionWidths: Array.from(
          document.querySelectorAll('.landing-container, .tweak-home .header-inner'),
        ).map((el) => el.getBoundingClientRect().width),
        padding: style(container).paddingLeft,
        heroTop: style(hero).paddingTop,
        heroBottom: style(hero).paddingBottom,
        font: style(hero.querySelector('h1')!).fontSize,
        lastLineCharacters: lineTops.filter((top) => top === lineTops.at(-1)).length,
        offerWidth: hero.querySelector('.landing-offer')!.getBoundingClientRect().width,
        featurePadding: style(document.querySelector('#features')!).paddingTop,
        featureColumns: style(features).gridTemplateColumns.split(' ').length,
        featureGap: style(features).gap,
        featureCardPadding: style(document.querySelector('.landing-feature')!).paddingTop,
        faqPadding: style(document.querySelector('#faq')!).paddingTop,
        processPadding: style(document.querySelector('#how-it-works')!).paddingTop,
        headlineMinHeight: style(document.querySelector('.landing-hero-content')!).minHeight,
        marqueeMargin: style(document.querySelector('.landing-hero-marquee')!).marginTop,
        showcaseHeadingGap: style(document.querySelector('.landing-section-heading h2')!)
          .marginBottom,
        featureHeadingGap: style(document.querySelector('.landing-section-intro h2')!).marginBottom,
      };
    });
    const maxWidth =
      width >= 1536
        ? 1536
        : width >= 1280
          ? 1280
          : width >= 1024
            ? 1024
            : width >= 768
              ? 768
              : width >= 640
                ? 640
                : width;
    expect(measurements.width).toBeCloseTo(Math.min(measurements.available, maxWidth), 0);
    for (const sectionWidth of measurements.sectionWidths)
      expect(sectionWidth).toBeCloseTo(measurements.width, 0);
    expect(measurements.padding).toBe(width >= 768 ? '24px' : '16px');
    expect(measurements.heroTop).toBe(width >= 768 ? '128px' : '80px');
    expect(measurements.heroBottom).toBe(width >= 768 ? '160px' : '128px');
    expect(measurements.font).toBe(
      width >= 1024 ? '96px' : width >= 768 ? '72px' : width >= 640 ? '60px' : '48px',
    );
    expect(measurements.offerWidth).toBeLessThanOrEqual(672);
    expect(measurements.lastLineCharacters).toBeGreaterThanOrEqual(2);
    expect(measurements.featurePadding).toBe(width >= 768 ? '128px' : '80px');
    expect(measurements.featureColumns).toBe(width >= 640 ? 2 : 1);
    expect(measurements.featureGap).toBe('24px');
    expect(measurements.featureCardPadding).toBe('24px');
    expect(measurements.faqPadding).toBe(width >= 768 ? '128px' : '96px');
    expect(measurements.processPadding).toBe(width >= 768 ? '128px' : '96px');
    expect(measurements.headlineMinHeight).toBe('0px');
    expect(measurements.marqueeMargin).toBe('80px');
    expect(measurements.showcaseHeadingGap).toBe('16px');
    expect(measurements.featureHeadingGap).toBe('16px');
  }
  // The upstream landing page uses content flow, not viewport-height-sized sections.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const first = await page.locator('.landing-hero').boundingBox();
  await page.setViewportSize({ width: 1280, height: 1440 });
  const second = await page.locator('.landing-hero').boundingBox();
  expect(second!.height).toBeCloseTo(first!.height, 0);
});
