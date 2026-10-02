import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base, now


def uid():
    return str(uuid.uuid4())


class Tool(Base):
    __tablename__ = "tools"
    slug: Mapped[str] = mapped_column(String(80), primary_key=True)
    config: Mapped[dict] = mapped_column(JSONB)


class Template(Base):
    __tablename__ = "templates"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    version: Mapped[int] = mapped_column(primary_key=True)
    config: Mapped[dict] = mapped_column(JSONB)


class AnonymousSession(Base):
    __tablename__ = "anonymous_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    session_id: Mapped[str] = mapped_column(ForeignKey("anonymous_sessions.id"), index=True)
    storage_key: Mapped[str] = mapped_column(String(200), unique=True)
    sha256: Mapped[str] = mapped_column(String(64))
    mime_type: Mapped[str] = mapped_column(String(40))
    byte_size: Mapped[int]
    width: Mapped[int]
    height: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Job(Base):
    __tablename__ = "render_jobs"
    __table_args__ = (
        UniqueConstraint("session_id", "idempotency_key"),
        Index("ix_job_claim", "status", "available_at", "created_at"),
        CheckConstraint(
            "status IN ('queued','running','cancel_requested','cancelled','succeeded','failed')"
        ),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    session_id: Mapped[str] = mapped_column(ForeignKey("anonymous_sessions.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    request_hash: Mapped[str] = mapped_column(String(64))
    render_hash: Mapped[str] = mapped_column(String(64))
    revision: Mapped[int]
    snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="queued")
    stage: Mapped[str] = mapped_column(String(24), default="queued")
    progress_current: Mapped[int] = mapped_column(default=0)
    progress_total: Mapped[int | None] = mapped_column(nullable=True)
    attempts: Mapped[int] = mapped_column(default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    lease_token: Mapped[str | None] = mapped_column(String(36))
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    worker_id: Mapped[str | None] = mapped_column(String(36))
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_detail: Mapped[str | None] = mapped_column(String(400))
    layout_manifest: Mapped[dict | None] = mapped_column(JSONB)


class JobAsset(Base):
    __tablename__ = "render_job_assets"
    job_id: Mapped[str] = mapped_column(
        ForeignKey("render_jobs.id", ondelete="CASCADE"), primary_key=True
    )
    asset_id: Mapped[str] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True
    )


class Output(Base):
    __tablename__ = "render_outputs"
    __table_args__ = (UniqueConstraint("job_id", "page_number"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    job_id: Mapped[str] = mapped_column(
        ForeignKey("render_jobs.id", ondelete="CASCADE"), index=True
    )
    page_number: Mapped[int]  # 0 is the ZIP archive; positive numbers are pages.
    storage_key: Mapped[str] = mapped_column(String(200), unique=True)
    mime_type: Mapped[str] = mapped_column(String(40))
    byte_size: Mapped[int]
    sha256: Mapped[str] = mapped_column(String(64))
    width: Mapped[int] = mapped_column(default=0)
    height: Mapped[int] = mapped_column(default=0)


class WorkerHeartbeat(Base):
    __tablename__ = "worker_heartbeats"
    worker_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
