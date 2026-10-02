from fastapi import APIRouter

from app.api.responses import ErrorResponse
from app.api.routes import assets, catalog, health, renders, session

api_router = APIRouter(
    prefix="/api/v1",
    responses={
        status: {"model": ErrorResponse}
        for status in (400, 401, 403, 404, 409, 410, 413, 422, 429, 503)
    },
)
for module in (health, catalog, session, assets, renders):
    api_router.include_router(module.router)
