"""Generate homepage samples through CreatorHub's real export service."""

import io
import sys
import time
import uuid
from pathlib import Path

import httpx
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.schemas import Brand, Layout


def main():
    samples = [
        (
            "landing-writing",
            "先写下来\n再慢慢修改",
            [
                "灵感出现的时候，先留下一句话。它不必完整，也不必漂亮。",
                "写完一小段，再回头看看。删掉多余的词，把真正想说的话留下来。",
                "今天的记录，也许就是下一篇文章的开始。",
            ],
        ),
        (
            "landing-sharing",
            "认真分享\n值得记录的事",
            [
                "一段散步的路，一本喜欢的书，一个突然想通的问题，都值得记录。",
                "给故事一个清楚的标题，为文字留一点空白，让读到它的人也能停下来。",
                "从自己的生活里出发，分享真实的感受。",
            ],
        ),
    ]
    with httpx.Client(
        base_url="http://127.0.0.1:8000/api/v1", timeout=30, trust_env=False
    ) as client:
        client.post("/session").raise_for_status()
        try:
            for filename, title, paragraphs in samples:
                payload = {
                    "schemaVersion": 1,
                    "draftId": str(uuid.uuid4()),
                    "revision": 0,
                    "document": {
                        "title": title,
                        "sourceFormat": "plain",
                        "sourceText": "\n\n".join(paragraphs),
                        "blocks": [
                            {"id": str(i), "type": "paragraph", "runs": [{"text": text}]}
                            for i, text in enumerate(paragraphs)
                        ],
                    },
                    "brand": Brand().model_dump(),
                    "layout": Layout().model_dump(),
                    "output": {"format": "png"},
                }
                response = client.post(
                    "/renders", json=payload, headers={"Idempotency-Key": str(uuid.uuid4())}
                )
                response.raise_for_status()
                job = response.json()
                deadline = time.monotonic() + 120
                while job["status"] in ("queued", "running", "cancel_requested"):
                    if time.monotonic() > deadline:
                        raise RuntimeError("Homepage sample render timed out")
                    time.sleep(0.5)
                    response = client.get("/renders/" + job["id"])
                    response.raise_for_status()
                    job = response.json()
                if job["status"] != "succeeded":
                    raise RuntimeError(job.get("error"))
                response = client.get(job["outputs"][0]["url"].removeprefix("/api/v1"))
                response.raise_for_status()
                target = ROOT / f"frontend/public/tool-previews/{filename}.webp"
                with Image.open(io.BytesIO(response.content)) as image:
                    image.resize((360, 480), Image.Resampling.LANCZOS).save(
                        target, "WEBP", quality=90
                    )
                print(f"Generated {filename} from the real renderer.")
        finally:
            client.delete("/session/data").raise_for_status()


if __name__ == "__main__":
    main()
