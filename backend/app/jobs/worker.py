import logging
import threading
import time
from datetime import timedelta

from playwright.sync_api import Error as BrowserError
from sqlalchemy import delete, select, update

from app.core.db import Session, now
from app.jobs.errors import RenderError
from app.jobs.queue import claim, finish, maintain, touch_worker
from app.jobs.renderer import render
from app.models import Job, WorkerHeartbeat, uid

log = logging.getLogger("creatorhub.worker")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def process(job, worker_id):
    stopped = threading.Event()
    finished = threading.Event()

    def heartbeat():
        while not finished.wait(5):
            try:
                touch_worker(worker_id)
                with Session() as db:
                    status = db.scalar(
                        select(Job.status).where(
                            Job.id == job.id, Job.lease_token == job.lease_token
                        )
                    )
                    if status != "running":
                        stopped.set()
                    db.execute(
                        update(Job)
                        .where(Job.id == job.id, Job.lease_token == job.lease_token)
                        .values(lease_expires_at=now() + timedelta(seconds=60))
                    )
                    db.commit()
            except Exception:
                stopped.set()
                return

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        render(job, stopped)
        log.info("job=%s completed", job.id)
    except Exception as exc:
        code = exc.code if isinstance(exc, RenderError) else "RENDER_FAILED"
        message = (
            exc.message
            if isinstance(exc, RenderError)
            else "图片生成失败，详情见 storage/worker.stderr.log，请重启 CreatorHub 后重试"
        )
        log.warning("job=%s error=%s type=%s", job.id, code, type(exc).__name__)
        if not isinstance(exc, RenderError):
            # Keep the underlying browser failure locally instead of losing it
            # behind the generic user-facing message. Do not log job contents.
            log.exception("Render operation failed for job=%s", job.id)
        with Session() as db:
            current = db.scalar(select(Job).where(Job.id == job.id).with_for_update())
            if current and current.lease_token == job.lease_token:
                if current.status == "cancel_requested":
                    finish(current, "cancelled")
                elif (
                    isinstance(exc, BrowserError)
                    or code
                    in ("BROWSER_START_FAILED", "RENDER_PAGE_UNAVAILABLE", "BROWSER_RENDER_FAILED")
                ) and current.attempts < 2:
                    current.status, current.stage = "queued", "queued"
                    current.available_at = now() + timedelta(seconds=2)
                    current.lease_token = None
                else:
                    finish(current, "failed", code, message)
                db.commit()
    finally:
        finished.set()
        thread.join(timeout=6)


def main():
    worker_id = uid()
    last_cleanup = 0
    log.info("CreatorHub worker started, concurrency=1")
    try:
        while True:
            try:
                touch_worker(worker_id)
                if time.monotonic() - last_cleanup > 30:
                    maintain()
                    last_cleanup = time.monotonic()
                job = claim(worker_id)
                if job:
                    process(job, worker_id)
                else:
                    time.sleep(1)
            except KeyboardInterrupt:
                break
            except Exception as exc:
                log.warning("worker loop error type=%s", type(exc).__name__)
                time.sleep(3)
    finally:
        with Session() as db:
            db.execute(delete(WorkerHeartbeat).where(WorkerHeartbeat.worker_id == worker_id))
            db.commit()


if __name__ == "__main__":
    main()
