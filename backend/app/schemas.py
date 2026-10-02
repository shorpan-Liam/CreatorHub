from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Run(StrictModel):
    text: str = Field(max_length=20000)
    bold: bool = False


class Block(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    type: Literal["paragraph", "heading", "quote", "list_item", "page_break"]
    runs: list[Run] = Field(default_factory=list, max_length=10000)
    level: Literal[2, 3] | None = None
    listId: str | None = Field(default=None, max_length=80)
    ordered: bool | None = None
    ordinal: int | None = Field(default=None, ge=1, le=10000)


class Document(StrictModel):
    title: str = Field(max_length=100)
    sourceFormat: Literal["plain", "markdown"] = "plain"
    sourceText: str = Field(max_length=100000)
    blocks: list[Block] = Field(max_length=2000)

    @model_validator(mode="after")
    def check_content(self):
        ids = [b.id for b in self.blocks]
        if len(ids) != len(set(ids)):
            raise ValueError("内容块编号重复")
        text = "".join(r.text for b in self.blocks for r in b.runs)
        if len(text) > 20000:
            raise ValueError("正文不能超过 20,000 字")
        if sum(len(b.runs) for b in self.blocks) > 10000:
            raise ValueError("文本样式片段过多")
        if not self.title.strip() and not text.strip():
            raise ValueError("请输入标题或正文")
        if any(b.runs for b in self.blocks if b.type == "page_break"):
            raise ValueError("分页符不能包含正文")
        return self


class Brand(StrictModel):
    name: str = Field(default="小潘同学", max_length=24)
    showName: bool = True
    showLogo: bool = False
    logoAssetId: str | None = Field(default=None, max_length=36)
    logoShape: Literal["circle", "original"] = "circle"
    fontSize: int = Field(default=28, ge=24, le=40)


class Layout(StrictModel):
    templateId: Literal["classic-reading"] = "classic-reading"
    templateVersion: Literal[1] = 1
    preset: Literal["portrait-3-4", "portrait-9-16"] = "portrait-3-4"
    width: Literal[1080] = 1080
    height: Literal[1440, 1920] = 1440
    titleFontSize: int = Field(default=104, ge=72, le=128)
    titleAutoFit: bool = False
    bodyFontSize: int = Field(default=40, ge=32, le=52)
    lineHeight: float = Field(default=1.7, ge=1.4, le=2)
    paragraphGap: int = Field(default=36, ge=16, le=72)
    paddingX: int = Field(default=80, ge=0, le=320)
    paddingY: int = Field(default=72, ge=0, le=480)
    firstPagePaddingTop: int | None = Field(default=None, ge=0, le=720)
    titleUnderline: bool = True
    showPageNumber: bool = True

    @model_validator(mode="after")
    def check_preset(self):
        if self.height != (1440 if self.preset == "portrait-3-4" else 1920):
            raise ValueError("画布尺寸与比例不匹配")
        return self


class OutputConfig(StrictModel):
    format: Literal["png", "jpeg"] = "png"


class Snapshot(StrictModel):
    schemaVersion: Literal[1] = 1
    draftId: str = Field(min_length=1, max_length=80)
    revision: int = Field(ge=0)
    document: Document
    brand: Brand
    layout: Layout
    output: OutputConfig
