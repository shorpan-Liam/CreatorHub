import hashlib
import io
import warnings
from datetime import timedelta

from PIL import Image, ImageOps
from sqlalchemy import func, select

from app.core.db import now
from app.core.errors import AppError
from app.models import Asset, uid
from app.services.common import storage_file


def upload_asset(file, who, db):
    raw = file.file.read(5 * 1024**2 + 1)
    if len(raw) > 5 * 1024**2:
        raise AppError(413, "ASSET_TOO_LARGE", "Logo 不能超过 5 MiB")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            img = Image.open(io.BytesIO(raw))
            if img.format not in ("PNG", "JPEG", "WEBP") or img.width * img.height > 16000000:
                raise ValueError("unsupported")
            img.load()
            img = ImageOps.exif_transpose(img).convert("RGBA")
            # A logo is displayed at 52px; keeping at most 1024px saves render memory.
            img.thumbnail((1024, 1024))
            clean = Image.new("RGBA", img.size)
            clean.paste(img)
            buffer = io.BytesIO()
            clean.save(buffer, format="PNG")
            data = buffer.getvalue()
    except Exception:
        raise AppError(
            422, "ASSET_DECODE_FAILED", "请上传有效的 PNG、JPG 或 WebP，图片不超过 1600 万像素"
        )
    count = db.scalar(
        select(func.count())
        .select_from(Asset)
        .where(Asset.session_id == who.id, Asset.expires_at > now())
    )
    if count >= 40:
        raise AppError(429, "ASSET_LIMIT", "临时素材较多，请先清理服务器临时数据")
    asset_id = uid()
    key = f"assets/{asset_id}.png"
    path = storage_file(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    asset = Asset(
        id=asset_id,
        session_id=who.id,
        storage_key=key,
        sha256=hashlib.sha256(data).hexdigest(),
        mime_type="image/png",
        byte_size=len(data),
        width=clean.width,
        height=clean.height,
        expires_at=now() + timedelta(hours=24),
    )
    db.add(asset)
    db.commit()
    return {
        "id": asset_id,
        "url": f"/api/v1/assets/{asset_id}/content",
        "width": clean.width,
        "height": clean.height,
    }
