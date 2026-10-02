import base64
import hashlib
import json
import logging
import time
import zipfile
from urllib.parse import urlparse

from PIL import Image
from playwright.sync_api import Error as BrowserError
from playwright.sync_api import sync_playwright
from sqlalchemy import select

from app.core.config import ROOT, settings
from app.core.db import Session
from app.jobs.errors import RenderError, browser_failure
from app.jobs.queue import finish, stage
from app.models import Asset, Job, Output

log = logging.getLogger("creatorhub.worker")


def render(job, stopped):
    payload = json.loads(json.dumps(job.snapshot))
    expected = payload.pop("rendererVersion", "")
    actual = hashlib.sha256((ROOT / "frontend/dist/index.html").read_bytes()).hexdigest()
    if actual != expected:
        raise RenderError("RENDERER_CHANGED", "排版版本已更新，请重新生成")
    logo_id = payload["brand"].get("logoAssetId")
    if payload["brand"]["showLogo"] and logo_id:
        with Session() as db:
            asset = db.scalar(
                select(Asset).where(Asset.id == logo_id, Asset.session_id == job.session_id)
            )
            if not asset:
                raise RenderError("ASSET_EXPIRED", "Logo 已过期，请重新上传")
            path = (settings.storage_root / asset.storage_key).resolve()
            if not path.is_relative_to(settings.storage_root.resolve()):
                raise RenderError("INVALID_ASSET", "图片不可用")
            payload["logoDataUrl"] = (
                "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()
            )
    directory = settings.storage_root / "renders" / job.id / str(job.attempts)
    directory.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()

    def check():
        if stopped.is_set():
            raise RenderError("CANCELLED", "任务已取消")
        if time.monotonic() - started > settings.render_timeout_seconds:
            raise RenderError("RENDER_TIMEOUT", "生成超时，请缩短文章后重试")

    with sync_playwright() as p:
        # All fonts and assets are served locally. Never route rendering through
        # a Windows system proxy or PAC, which may change between user sessions.
        try:
            browser = p.chromium.launch(headless=True, args=["--no-proxy-server"])
        except BrowserError as exc:
            log.exception("Browser launch failed for job=%s", job.id)
            raise RenderError(*browser_failure(exc, "launching")) from exc
        phase = "loading"
        try:
            context = browser.new_context(
                viewport={"width": 1200, "height": 2100},
                device_scale_factor=1,
                locale="zh-CN",
                timezone_id="Asia/Shanghai",
            )
            allowed = urlparse(settings.render_base_url).netloc
            context.route(
                "**/*",
                lambda route: (
                    route.continue_()
                    if urlparse(route.request.url).netloc == allowed
                    else route.abort()
                ),
            )
            page = context.new_page()
            page.set_default_timeout(30000)
            stage(job, "loading")
            page.goto(settings.render_base_url, wait_until="networkidle")
            page.wait_for_function('typeof window.renderCreatorHub === "function"')
            phase = "rendering"
            page.evaluate("(payload) => { window.renderCreatorHub(payload); }", payload)
            stage(job, "paginating")
            while True:
                check()
                result = page.evaluate("window.creatorHubResult || null")
                if result:
                    break
                page.wait_for_timeout(150)
            if result.get("error"):
                raise RenderError(result["error"]["code"], result["error"]["message"])
            manifest = result["manifest"]
            total = manifest["pageCount"]
            if not 1 <= total <= 50:
                raise RenderError("PAGE_LIMIT_EXCEEDED", "图片数量超过 50 页，请拆分文章")
            files = []
            ext = "png" if payload["output"]["format"] == "png" else "jpg"
            for index in range(total):
                check()
                stage(job, "rendering", index, total)
                path = directory / f"{index + 1:02d}.{ext}"
                options = {"type": "png"} if ext == "png" else {"type": "jpeg", "quality": 95}
                page.locator("[data-render-page]").nth(index).screenshot(
                    path=str(path), animations="disabled", **options
                )
                with Image.open(path) as img:
                    if img.size != (payload["layout"]["width"], payload["layout"]["height"]):
                        raise RenderError("INVALID_DIMENSIONS", "图片尺寸异常，请重试")
                    img.verify()
                files.append(path)
            stage(job, "packaging", total, total)
            archive = directory / "images.zip"
            with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
                for path in files:
                    z.write(path, path.name)
            check()
            outputs = []
            for number, path in [(i + 1, path) for i, path in enumerate(files)] + [(0, archive)]:
                outputs.append(
                    Output(
                        job_id=job.id,
                        page_number=number,
                        storage_key=path.relative_to(settings.storage_root).as_posix(),
                        mime_type="application/zip"
                        if number == 0
                        else f"image/{'png' if ext == 'png' else 'jpeg'}",
                        byte_size=path.stat().st_size,
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                        width=payload["layout"]["width"] if number else 0,
                        height=payload["layout"]["height"] if number else 0,
                    )
                )
            with Session() as db:
                current = db.scalar(select(Job).where(Job.id == job.id).with_for_update())
                if current.lease_token != job.lease_token or current.status != "running":
                    raise RenderError("CANCELLED", "任务已取消")
                db.add_all(outputs)
                current.layout_manifest = manifest
                current.progress_current, current.progress_total = total, total
                finish(current, "succeeded")
                db.commit()
        except BrowserError as exc:
            log.exception("Browser failure phase=%s job=%s", phase, job.id)
            raise RenderError(*browser_failure(exc, phase)) from exc
        finally:
            browser.close()
