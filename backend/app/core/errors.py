import logging

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.models import uid

log = logging.getLogger("creatorhub.api")


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status, self.code, self.message = status, code, message


def error(status, code, message, request_id=None):
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "requestId": request_id or uid(),
            }
        },
        headers={"Retry-After": "10"} if status == 429 else None,
    )


def install_error_handlers(app):
    @app.exception_handler(AppError)
    async def app_error(request, exc):
        return error(exc.status, exc.code, exc.message, getattr(request.state, "request_id", None))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        issues = exc.errors()
        message = "; ".join(f"{'.'.join(map(str, e['loc'][1:]))}: {e['msg']}" for e in issues[:3])
        return error(422, "INVALID_INPUT", message, getattr(request.state, "request_id", None))

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        request_id = getattr(request.state, "request_id", None)
        log.error(
            "Database request failed request_id=%s exception=%s", request_id, type(exc).__name__
        )
        return error(
            503, "DATABASE_UNAVAILABLE", "数据库暂不可用，草稿仍保存在当前浏览器。", request_id
        )
