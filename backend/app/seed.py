from .db import Session
from .models import Template, Tool
from .schemas import Layout


def seed():
    with Session() as db:
        db.merge(
            Tool(
                slug="article-to-images",
                config={
                    "slug": "article-to-images",
                    "name": "文章转图片",
                    "description": "把一篇文章，排成一组好读的图片。",
                    "category": "graphic-content",
                    "platforms": ["xiaohongshu", "douyin", "zhihu"],
                    "keywords": ["长文", "分页", "图文", "小红书", "排版"],
                    "status": "available",
                    "route": "/tools/article-to-images",
                    "iconKey": "article-images",
                    "sortOrder": 10,
                },
            )
        )
        if not db.get(Template, ("classic-reading", 1)):
            db.add(
                Template(
                    id="classic-reading",
                    version=1,
                    config={
                        "name": "经典阅读",
                        "defaults": Layout().model_dump(),
                        "font": "Noto Serif SC",
                        "license": "SIL Open Font License 1.1",
                    },
                )
            )
        db.commit()


if __name__ == "__main__":
    seed()
    print("CreatorHub catalog and template ready.")
