from fastapi import APIRouter, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.api.deps import OwnerDep, SessionDep
from app.api.responses import AssetResponse
from app.core.db import now
from app.core.errors import AppError
from app.models import Asset, Job, JobAsset
from app.services import assets
from app.services.common import get_owned, storage_file
from app.services.renders import ACTIVE

router = APIRouter(tags=["assets"])


@router.post("/assets", status_code=201, response_model=AssetResponse)
def upload_asset(who: OwnerDep, db: SessionDep, file: UploadFile = File(...)):
    return assets.upload_asset(file, who, db)


@router.get("/assets/{asset_id}/content")
def asset_content(asset_id: str, who: OwnerDep, db: SessionDep):
    asset = get_owned(db, Asset, asset_id, who.id)
    if asset.expires_at <= now():
        raise AppError(410, "ASSET_EXPIRED", "Logo 已过期，请重新上传")
    return FileResponse(storage_file(asset.storage_key), media_type=asset.mime_type)


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset(asset_id: str, who: OwnerDep, db: SessionDep):
    asset = get_owned(db, Asset, asset_id, who.id)
    used = db.scalar(
        select(JobAsset).join(Job).where(JobAsset.asset_id == asset_id, Job.status.in_(ACTIVE))
    )
    if used:
        raise AppError(409, "ASSET_IN_USE", "图片正在使用，请等待任务完成")
    storage_file(asset.storage_key).unlink(missing_ok=True)
    db.delete(asset)
    db.commit()
