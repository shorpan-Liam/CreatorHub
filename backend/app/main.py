from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.main import api_router
from app.core.config import ROOT
from app.core.errors import AppError, error, install_error_handlers
from app.core.security import boundary


def create_app():
    app = FastAPI(title="CreatorHub", version="0.1.0")
    install_error_handlers(app)
    app.middleware("http")(boundary)
    app.include_router(api_router)
    dist = ROOT / "frontend/dist"
    if (dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="static-assets")
    if (dist / "tool-previews").exists():
        app.mount(
            "/tool-previews", StaticFiles(directory=dist / "tool-previews"), name="tool-previews"
        )

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path.startswith("api/"):
            raise AppError(404, "NOT_FOUND", "接口不存在")
        if path == "favicon.svg" and (dist / path).is_file():
            return FileResponse(dist / path)
        if not (dist / "index.html").is_file():
            return error(503, "BUILD_REQUIRED", "请在 frontend 目录执行 npm run build")
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-cache"})

    return app


app = create_app()
