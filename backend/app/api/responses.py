from typing import Literal

from pydantic import BaseModel

from app.schemas import Layout


class ErrorDetail(BaseModel):
    code: str
    message: str
    requestId: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class ToolDefinition(BaseModel):
    slug: str
    name: str
    description: str
    category: str
    platforms: list[str]
    keywords: list[str]
    status: Literal["available", "coming_soon", "hidden"]
    route: str
    iconKey: str = ""
    sortOrder: int = 0


class ToolList(BaseModel):
    items: list[ToolDefinition]


class TemplateDefinition(BaseModel):
    id: str
    version: int
    name: str
    defaults: Layout
    font: str
    license: str


class TemplateList(BaseModel):
    items: list[TemplateDefinition]


class AssetResponse(BaseModel):
    id: str
    url: str
    width: int
    height: int


class JobProgress(BaseModel):
    current: int
    total: int | None


class JobOutput(BaseModel):
    page: int
    width: int
    height: int
    bytes: int
    sha256: str
    url: str


class JobError(BaseModel):
    code: str
    message: str


class JobResponse(BaseModel):
    id: str
    status: Literal["queued", "running", "cancel_requested", "cancelled", "failed", "succeeded"]
    stage: str
    revision: int
    renderHash: str
    expired: bool
    progress: JobProgress
    createdAt: str
    expiresAt: str | None
    outputs: list[JobOutput]
    archiveUrl: str | None
    warnings: list[str]
    error: JobError | None
