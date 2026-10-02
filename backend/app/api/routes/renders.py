from fastapi import APIRouter, Header

from app.api.deps import OwnerDep, SessionDep
from app.api.responses import JobResponse
from app.core.errors import AppError
from app.models import Job
from app.schemas import Snapshot
from app.services import renders
from app.services.common import get_owned

router = APIRouter(tags=["renders"])


@router.post("/renders", status_code=202, response_model=JobResponse)
def create_render(
    snapshot: Snapshot,
    who: OwnerDep,
    db: SessionDep,
    idempotency_key: str = Header(min_length=1, max_length=100),
):
    return renders.create_render(snapshot, who, db, idempotency_key)


@router.get("/renders/{job_id}", response_model=JobResponse)
def get_render(job_id: str, who: OwnerDep, db: SessionDep):
    return renders.job_response(db, get_owned(db, Job, job_id, who.id))


@router.post("/renders/{job_id}/cancel", response_model=JobResponse)
def cancel_render(job_id: str, who: OwnerDep, db: SessionDep):
    return renders.cancel_render(job_id, who, db)


@router.get("/renders/{job_id}/pages/{page}")
def page_file(job_id: str, page: int, who: OwnerDep, db: SessionDep, download: bool = False):
    if page < 1:
        raise AppError(404, "NOT_FOUND", "页码不存在")
    return renders.result_file(job_id, page, who, db, download)


@router.get("/renders/{job_id}/archive")
def archive(job_id: str, who: OwnerDep, db: SessionDep):
    return renders.result_file(job_id, 0, who, db, True)
