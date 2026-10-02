import shutil
from datetime import timedelta

from sqlalchemy import delete, or_, select, update

from app.core.config import settings
from app.core.db import Session, now
from app.jobs.errors import RenderError
from app.models import Asset, Job, JobAsset, Output, WorkerHeartbeat, uid

ACTIVE = ("queued", "running", "cancel_requested")


def touch_worker(worker_id):
    with Session() as db:
        db.merge(WorkerHeartbeat(worker_id=worker_id, last_seen_at=now()))
        db.commit()


def finish(job, status, code=None, message=None):
    job.status, job.stage = status, "finished"
    job.finished_at = now()
    # Explicit user cleanup expiration must not be extended by late completion.
    job.expires_at = job.expires_at or now() + timedelta(hours=settings.result_ttl_hours)
    job.error_code, job.error_detail = code, message
    job.lease_token = None
    job.lease_expires_at = None


def claim(worker_id):
    with Session() as db:
        job = db.scalar(
            select(Job)
            .where(Job.status == "queued", Job.available_at <= now())
            .order_by(Job.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not job:
            return None
        job.status, job.stage = "running", "validating"
        job.worker_id, job.lease_token = worker_id, uid()
        job.lease_expires_at = now() + timedelta(seconds=60)
        job.attempts += 1
        job.started_at = now()
        job.error_code, job.error_detail = None, None
        db.commit()
        return job


def maintain():
    with Session() as db:
        for job in db.scalars(
            select(Job)
            .where(Job.status.in_(("running", "cancel_requested")), Job.lease_expires_at < now())
            .with_for_update(skip_locked=True)
        ):
            if job.status == "cancel_requested":
                finish(job, "cancelled")
            elif job.attempts < 2:
                job.status, job.stage = "queued", "queued"
                job.lease_token = None
                job.available_at = now()
            else:
                finish(job, "failed", "WORKER_INTERRUPTED", "出图进程中断，请重新生成")
        for job in db.scalars(
            select(Job)
            .where(Job.status == "queued", Job.created_at < now() - timedelta(minutes=30))
            .with_for_update(skip_locked=True)
        ):
            finish(job, "failed", "QUEUE_TIMEOUT", "排队超时，请检查出图服务后重试")
        db.commit()
    with Session() as db:
        for job in db.scalars(
            select(Job)
            .where(Job.expires_at <= now(), ~Job.status.in_(ACTIVE))
            .with_for_update(skip_locked=True)
        ):
            directory = (settings.storage_root / "renders" / job.id).resolve()
            if directory.is_relative_to(settings.storage_root.resolve()) and directory.exists():
                shutil.rmtree(directory)
            db.execute(delete(Output).where(Output.job_id == job.id))
            db.execute(delete(JobAsset).where(JobAsset.job_id == job.id))
            job.snapshot, job.layout_manifest = None, None
            if job.finished_at and job.finished_at < now() - timedelta(days=7):
                db.delete(job)
        db.commit()
    with Session() as db:
        for asset in db.scalars(
            select(Asset).where(Asset.expires_at <= now()).with_for_update(skip_locked=True)
        ):
            reference = db.scalar(
                select(JobAsset)
                .join(Job)
                .where(
                    JobAsset.asset_id == asset.id,
                    or_(Job.status.in_(ACTIVE), Job.expires_at > now()),
                )
            )
            if reference:
                continue
            path = (settings.storage_root / asset.storage_key).resolve()
            if path.is_relative_to(settings.storage_root.resolve()):
                path.unlink(missing_ok=True)
            db.delete(asset)
        db.commit()


def stage(job, name, current=0, total=None):
    with Session() as db:
        result = db.execute(
            update(Job)
            .where(Job.id == job.id, Job.lease_token == job.lease_token, Job.status == "running")
            .values(stage=name, progress_current=current, progress_total=total)
        )
        db.commit()
        if result.rowcount != 1:
            raise RenderError("CANCELLED", "任务已取消")
