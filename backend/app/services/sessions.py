import hashlib
import secrets
from datetime import timedelta

from sqlalchemy import select

from app.core.db import now
from app.core.security import COOKIE
from app.models import AnonymousSession, Asset, Job


def create_session(request, response, db):
    token = request.cookies.get(COOKIE, "")
    digest = hashlib.sha256(token.encode()).hexdigest()
    record = (
        db.scalar(
            select(AnonymousSession).where(
                AnonymousSession.token_hash == digest, AnonymousSession.expires_at > now()
            )
        )
        if token
        else None
    )
    if not record:
        token = secrets.token_urlsafe(32)
        record = AnonymousSession(
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            expires_at=now() + timedelta(days=30),
        )
        db.add(record)
    record.expires_at = now() + timedelta(days=30)
    db.commit()
    response.set_cookie(COOKIE, token, httponly=True, samesite="lax", max_age=30 * 86400, path="/")


def clear_server(who, db):
    for job in db.scalars(select(Job).where(Job.session_id == who.id).with_for_update()):
        if job.status == "running":
            job.status = "cancel_requested"
        elif job.status == "queued":
            job.status = "cancelled"
            job.finished_at = now()
        job.expires_at = now()
    for asset in db.scalars(select(Asset).where(Asset.session_id == who.id)):
        asset.expires_at = now()
    db.commit()
    return {"status": "cleanup_requested"}
