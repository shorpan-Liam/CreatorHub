import hashlib
import json
import re
from datetime import timedelta
from pathlib import Path

from fastapi.responses import FileResponse
from sqlalchemy import func, select, text

from app.core.config import ROOT
from app.core.db import now
from app.core.errors import AppError
from app.models import Asset, Job, JobAsset, Output, WorkerHeartbeat
from app.services.common import get_owned, storage_file

ACTIVE = ("queued", "running", "cancel_requested")


def job_response(db, job):
    expired = bool(job.expires_at and job.expires_at <= now())
    outputs = []
    if job.status == "succeeded" and not expired:
        for item in db.scalars(
            select(Output)
            .where(Output.job_id == job.id, Output.page_number > 0)
            .order_by(Output.page_number)
        ):
            outputs.append(
                {
                    "page": item.page_number,
                    "width": item.width,
                    "height": item.height,
                    "bytes": item.byte_size,
                    "sha256": item.sha256,
                    "url": f"/api/v1/renders/{job.id}/pages/{item.page_number}",
                }
            )
    return {
        "id": job.id,
        "status": job.status,
        "stage": job.stage,
        "revision": job.revision,
        "renderHash": job.render_hash,
        "expired": expired,
        "progress": {"current": job.progress_current, "total": job.progress_total},
        "createdAt": job.created_at.isoformat(),
        "expiresAt": job.expires_at.isoformat() if job.expires_at else None,
        "outputs": outputs,
        "archiveUrl": f"/api/v1/renders/{job.id}/archive" if outputs else None,
        "warnings": (job.layout_manifest or {}).get("warnings", []),
        "error": {"code": job.error_code, "message": job.error_detail} if job.error_code else None,
    }


def create_render(snapshot, who, db, idempotency_key):
    payload = snapshot.model_dump(exclude_none=True)
    request_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
    # Serialize capacity and idempotency decisions across API processes.
    db.execute(text("SELECT pg_advisory_xact_lock(731941)"))
    previous = db.scalar(
        select(Job).where(Job.session_id == who.id, Job.idempotency_key == idempotency_key)
    )
    if previous:
        if previous.request_hash != request_hash:
            raise AppError(409, "IDEMPOTENCY_CONFLICT", "同一请求标识对应了不同内容")
        return job_response(db, previous)
    worker = db.scalar(
        select(WorkerHeartbeat).where(WorkerHeartbeat.last_seen_at > now() - timedelta(seconds=30))
    )
    if not worker:
        raise AppError(
            503, "WORKER_UNAVAILABLE", "出图服务未启动，草稿已保留。请启动本地服务后重试。"
        )
    total = db.scalar(select(func.count()).select_from(Job).where(Job.status.in_(ACTIVE)))
    own = db.scalar(
        select(func.count())
        .select_from(Job)
        .where(Job.status.in_(ACTIVE), Job.session_id == who.id)
    )
    recent = db.scalar(
        select(func.count())
        .select_from(Job)
        .where(Job.session_id == who.id, Job.created_at > now() - timedelta(minutes=1))
    )
    if total >= 20 or own >= 2 or recent >= 5:
        raise AppError(429, "QUEUE_LIMIT", "任务较多，请稍后重试")
    asset = None
    if snapshot.brand.showLogo:
        asset = get_owned(db, Asset, snapshot.brand.logoAssetId or "", who.id)
        if asset.expires_at <= now():
            raise AppError(410, "ASSET_EXPIRED", "Logo 已过期，请重新上传")
        asset.expires_at = now() + timedelta(hours=25)
    hash_payload = json.loads(json.dumps(payload))
    hash_payload.pop("revision")
    hash_payload.pop("draftId")
    hash_payload["brand"]["logoAssetId"] = asset.sha256 if asset else None
    # Build hash binds a task to the exact compiled renderer and fonts.
    index_path = ROOT / "frontend/dist/index.html"
    if not index_path.exists():
        raise AppError(503, "RENDERER_UNAVAILABLE", "请先构建前端渲染页面")
    payload["rendererVersion"] = hashlib.sha256(index_path.read_bytes()).hexdigest()
    hash_payload["rendererVersion"] = payload["rendererVersion"]
    render_hash = hashlib.sha256(json.dumps(hash_payload, sort_keys=True).encode()).hexdigest()
    job = Job(
        session_id=who.id,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
        render_hash=render_hash,
        revision=snapshot.revision,
        snapshot=payload,
    )
    db.add(job)
    db.flush()
    if asset:
        db.add(JobAsset(job_id=job.id, asset_id=asset.id))
    db.commit()
    return job_response(db, job)


def cancel_render(job_id, who, db):
    job = db.scalar(select(Job).where(Job.id == job_id, Job.session_id == who.id).with_for_update())
    if not job:
        raise AppError(404, "NOT_FOUND", "任务不存在")
    if job.status == "queued":
        job.status = "cancelled"
        job.finished_at = now()
        job.expires_at = now() + timedelta(hours=24)
    elif job.status == "running":
        job.status = "cancel_requested"
    db.commit()
    return job_response(db, job)


def result_file(job_id, page, who, db, download):
    job = get_owned(db, Job, job_id, who.id)
    if job.expires_at and job.expires_at <= now():
        raise AppError(410, "RESULT_EXPIRED", "结果已过期，请从草稿重新生成")
    if job.status != "succeeded":
        raise AppError(409, "RESULT_NOT_READY", "图片尚未生成完成")
    output = db.scalar(select(Output).where(Output.job_id == job_id, Output.page_number == page))
    if not output or not storage_file(output.storage_key).is_file():
        raise AppError(404, "NOT_FOUND", "文件不存在，请重新生成")
    ext = Path(output.storage_key).suffix
    title = (
        re.sub(
            r'[\\/:*?"<>|\x00-\x1f]', "", (job.snapshot or {}).get("document", {}).get("title", "")
        )[:40]
        or "CreatorHub"
    )
    filename = f"{title}-{job.created_at:%Y%m%d}.zip" if page == 0 else f"{page:02d}{ext}"
    return FileResponse(
        storage_file(output.storage_key),
        media_type=output.mime_type,
        filename=filename if download else None,
        content_disposition_type="attachment" if download else "inline",
    )
