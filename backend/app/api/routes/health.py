from datetime import timedelta

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.api.deps import SessionDep
from app.core.config import ROOT
from app.core.db import now
from app.models import WorkerHeartbeat

router = APIRouter(tags=["health"])


@router.get("/health/live")
def live():
    return {"status": "ok"}


@router.get("/health/ready")
def ready(db: SessionDep):
    db.execute(text("SELECT 1"))
    worker = db.scalar(
        select(WorkerHeartbeat).where(WorkerHeartbeat.last_seen_at > now() - timedelta(seconds=30))
    )
    built = (ROOT / "frontend/dist/index.html").exists()
    return JSONResponse(
        status_code=200 if worker and built else 503,
        content={
            "status": "ok" if worker and built else "degraded",
            "database": True,
            "worker": bool(worker),
            "renderer": built,
        },
    )
