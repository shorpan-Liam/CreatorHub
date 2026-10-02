from fastapi import APIRouter, Request, Response

from app.api.deps import OwnerDep, SessionDep
from app.services import sessions

router = APIRouter(tags=["session"])


@router.post("/session", status_code=204)
def session(request: Request, response: Response, db: SessionDep):
    sessions.create_session(request, response, db)


@router.delete("/session/data", status_code=202)
def clear_server(who: OwnerDep, db: SessionDep):
    return sessions.clear_server(who, db)
