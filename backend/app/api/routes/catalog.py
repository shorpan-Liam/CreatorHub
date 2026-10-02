from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import SessionDep
from app.api.responses import TemplateList, ToolList
from app.models import Template, Tool

router = APIRouter(tags=["catalog"])


@router.get("/tools", response_model=ToolList)
def tools(db: SessionDep):
    items = [t.config for t in db.scalars(select(Tool)) if t.config.get("status") != "hidden"]
    return {"items": sorted(items, key=lambda x: x.get("sortOrder", 0))}


@router.get("/templates", response_model=TemplateList)
def templates(db: SessionDep):
    return {
        "items": [
            {"id": t.id, "version": t.version, **t.config} for t in db.scalars(select(Template))
        ]
    }
