import hashlib
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.db import get_db, now
from app.core.errors import AppError
from app.core.security import COOKIE
from app.models import AnonymousSession


def owner(request: Request, db: DbSession = Depends(get_db)):
    token = request.cookies.get(COOKIE, "")
    record = (
        db.scalar(
            select(AnonymousSession).where(
                AnonymousSession.token_hash == hashlib.sha256(token.encode()).hexdigest(),
                AnonymousSession.expires_at > now(),
            )
        )
        if token
        else None
    )
    if not record:
        raise AppError(401, "SESSION_REQUIRED", "请重新连接服务后再试")
    return record


SessionDep = Annotated[DbSession, Depends(get_db)]
OwnerDep = Annotated[AnonymousSession, Depends(owner)]
