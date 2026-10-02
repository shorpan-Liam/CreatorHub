import { test, expect, type Page } from '@playwright/test';

async function openEditor(page: Page) {
  await page.goto('/tools/article-to-images');
  await expect(page.getByLabel('标题', { exact: true })).toBeVisible();
}

async function settings(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('tab', { name: '版式', exact: true }).click();
}

test('catalog search, favorites and actual cover', async ({ page }) => {
  await page.goto('/tools');
  await expect(page.getByRole('heading', { name: '创作工具仓库' })).toBeVisible();
  await expect(page.getByRole('img', { name: '文章排版示例' })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: '文章排版示例' })
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByLabel('搜索工具').fill('不存在的工具');
  await expect(page.getByText('未找到工具')).toBeVisible();
  await page.getByLabel('搜索工具').fill('小红书');
  await page.getByRole('button', { name: '收藏文章转图片', exact: true }).click();
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await expect(page.getByRole('link', { name: '打开文章转图片' })).toBeVisible();
  await page.screenshot({ path: `test-results/catalog-${test.info().project.name}.png` });
});

test('draft survives navigation and reload; undo and redo preserve text', async ({ page }) => {
  await openEditor(page);
  const workspace = await page.locator('.editor').boundingBox();
  expect(workspace!.y).toBe(64);
  expect(workspace!.y + workspace!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.getByLabel('标题', { exact: true }).fill('重构验证');
  await page.getByLabel('正文', { exact: true }).fill('第一段。\n\n第二段。');
  await page.getByLabel('撤销', { exact: true }).click();
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue('');
  await page.getByLabel('重做', { exact: true }).click();
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue('第一段。\n\n第二段。');
  await page.getByRole('link', { name: '返回工具库' }).click();
  await page.getByRole('link', { name: '打开文章转图片' }).click();
  await expect(page.getByLabel('标题', { exact: true })).toHaveValue('重构验证');
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue('第一段。\n\n第二段。');
  await expect(page.getByRole('status').filter({ hasText: '已保存到本机' })).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue('第一段。\n\n第二段。');
});

test('padding presets, cover override and paragraph indent', async ({ page, isMobile }) => {
  await openEditor(page);
  await page.getByLabel('标题', { exact: true }).fill('边距验证');
  await page.getByLabel('正文', { exact: true }).fill('段落首行缩进两个汉字。\n\n下一段同样缩进。');
  await settings(page, isMobile);
  await page.getByRole('button', { name: '9:16 高版' }).click();
  await page.getByLabel('左右留白数值').fill('160');
  await page.getByLabel('上下留白数值').fill('120');
  await page.getByLabel('首页顶部单独调整').check();
  await page.getByLabel('首页顶部留白数值').fill('360');
  await page.getByLabel('边距收藏名称').fill('验证边距');
  await page.getByRole('button', { name: '收藏当前边距' }).click();
  await page.getByLabel('左右留白数值').fill('80');
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByLabel('左右留白数值')).toHaveValue('160');
  await expect(page.getByLabel('首页顶部留白数值')).toHaveValue('360');
  if (isMobile) await page.getByRole('tab', { name: '预览', exact: true }).click();
  await expect(page.locator('[data-render-page="1"]')).toBeVisible();
  await expect
    .poll(() =>
      page.locator('[data-render-page="1"]').evaluate((el) => (el as HTMLElement).style.paddingTop),
    )
    .toBe('360px');
  await expect(page.locator('[data-block-id="b0"]')).toHaveCSS('text-indent', '80px');
  await page.screenshot({ path: `test-results/editor-${test.info().project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('generate real images and ZIP; edited text invalidates downloads', async ({
  page,
  isMobile,
}) => {
  await openEditor(page);
  await page.getByLabel('标题', { exact: true }).fill('真实出图验证');
  await page
    .getByLabel('正文', { exact: true })
    .fill('第一段正文，首行缩进。\n\n第二段正文，保留原文。');
  await page.getByRole('button', { name: '生成图片', exact: true }).click();
  await expect(page.getByRole('link', { name: '下载全部', exact: true })).toBeVisible({
    timeout: 60_000,
  });
  const image = page.getByRole('img', { name: '第 1 页高清图片' });
  await expect
    .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBe(1080);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: '下载全部', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  await page.screenshot({ path: `test-results/generated-${test.info().project.name}.png` });
  if (isMobile) await page.getByRole('tab', { name: '内容', exact: true }).click();
  await page.getByLabel('正文', { exact: true }).fill('更新后的正文。');
  await expect(page.getByRole('link', { name: '下载全部', exact: true })).toHaveCount(0);
});

test('render service failure keeps article and can be retried', async ({ page }) => {
  await openEditor(page);
  await page.getByLabel('标题', { exact: true }).fill('异常验证');
  await page.getByLabel('正文', { exact: true }).fill('这段内容需要保留。');
  await page.route('**/api/v1/renders', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'WORKER_UNAVAILABLE', message: '测试出图服务未启动', requestId: 'test' },
      }),
    }),
  );
  await page.getByRole('button', { name: '生成图片', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('测试出图服务未启动');
  await expect(page.getByLabel('正文', { exact: true })).toHaveValue('这段内容需要保留。');
  await expect(page.getByRole('button', { name: '生成图片', exact: true })).toBeEnabled();
});

test('draft dialog has focus, closes with Escape and menu exports a backup', async ({ page }) => {
  await openEditor(page);
  await page.getByLabel('标题', { exact: true }).fill('草稿弹窗验证');
  await page.getByLabel('本机草稿', { exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('更多操作', { exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: '备份项目文件' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.creatorhub\.json$/);
});
