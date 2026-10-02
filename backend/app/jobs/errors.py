def browser_failure(exc, phase):
    """Return useful public errors without leaking local paths or article data."""
    if "Executable doesn't exist" in str(exc):
        return (
            "BROWSER_NOT_INSTALLED",
            "Playwright Chromium 安装不完整，请在项目目录运行 .venv\\Scripts\\python.exe -m playwright install chromium",
        )
    if phase == "launching":
        return (
            "BROWSER_START_FAILED",
            "出图浏览器启动失败，请重启 CreatorHub 后重试；详情见 storage/worker.stderr.log",
        )
    if phase == "loading":
        return (
            "RENDER_PAGE_UNAVAILABLE",
            "出图服务无法加载本机排版页面，请重启 CreatorHub 并检查 8000 端口；详情见 storage/worker.stderr.log",
        )
    return (
        "BROWSER_RENDER_FAILED",
        "浏览器排版或截图失败，请重启 CreatorHub 后重新生成；详情见 storage/worker.stderr.log",
    )


class RenderError(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message
