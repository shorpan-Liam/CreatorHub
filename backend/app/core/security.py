from fastapi import Request

from app.core.config import settings
from app.core.errors import error
from app.models import uid

COOKIE = "creatorhub_session"


async def boundary(request: Request, call_next):
    request.state.request_id = uid()
    if request.url.hostname not in ("127.0.0.1", "localhost", "testserver"):
        return error(400, "INVALID_HOST", "仅允许本机访问")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        allowed = {
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            f"http://127.0.0.1:{settings.api_port}",
            f"http://localhost:{settings.api_port}",
        }
        if origin and origin not in allowed:
            return error(403, "INVALID_ORIGIN", "请求来源不受支持")
        if request.headers.get("sec-fetch-site") == "cross-site":
            return error(403, "INVALID_ORIGIN", "请求来源不受支持")
        limit = 2 * 1024**2 if request.url.path.endswith("/renders") else 6 * 1024**2
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > limit:
                return error(413, "REQUEST_TOO_LARGE", "提交内容过大")
        request._body = bytes(body)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "same-origin"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response
