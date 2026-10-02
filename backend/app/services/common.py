from sqlalchemy import select

from app.core.config import settings
from app.core.errors import AppError


def storage_file(key: str):
    root = settings.storage_root.resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise AppError(404, "NOT_FOUND", "文件不存在")
    return path


def get_owned(db, model, resource_id, session_id):
    record = db.scalar(select(model).where(model.id == resource_id, model.session_id == session_id))
    if not record:
        raise AppError(404, "NOT_FOUND", "内容不存在或已清理")
    return record
