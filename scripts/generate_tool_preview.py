"""Create the catalog cover from the real renderer using a disposable sample."""
import io
import sys
import time
import uuid
from pathlib import Path

import httpx
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.schemas import Brand, Layout

with httpx.Client(base_url='http://127.0.0.1:8000/api/v1', timeout=30, trust_env=False) as client:
    client.post('/session').raise_for_status()
    paragraphs = [
        '读到喜欢的段落，就停下来。在书页旁写几句自己的想法，比急着读完更有意思。',
        '把手机放远一些，倒一杯水。窗外的声音偶尔传来，也不妨碍这一小段安静的时间。',
        '不必给每次阅读设定目标。今天记住一句话，也是一份收获。',
    ]
    payload = {'schemaVersion': 1, 'draftId': str(uuid.uuid4()), 'revision': 0,
               'document': {'title': '周末的阅读\n留一点时间', 'sourceFormat': 'plain', 'sourceText': '\n\n'.join(paragraphs),
                            'blocks': [{'id': str(i), 'type': 'paragraph', 'runs': [{'text': text, 'bold': False}]} for i, text in enumerate(paragraphs)]},
               'brand': Brand().model_dump(), 'layout': Layout().model_dump(), 'output': {'format': 'png'}}
    response = client.post('/renders', json=payload, headers={'Idempotency-Key': str(uuid.uuid4())})
    response.raise_for_status()
    job = response.json()
    deadline = time.monotonic() + 120
    while job['status'] in ('queued', 'running', 'cancel_requested'):
        if time.monotonic() > deadline:
            raise RuntimeError('Sample render timed out')
        time.sleep(.5)
        response = client.get('/renders/' + job['id'])
        response.raise_for_status()
        job = response.json()
    if job['status'] != 'succeeded':
        raise RuntimeError(job.get('error'))
    response = client.get(job['outputs'][0]['url'].removeprefix('/api/v1'))
    response.raise_for_status()
    target = ROOT / 'frontend/public/tool-previews/article-to-images.webp'
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(response.content)) as image:
        image.resize((360, 480), Image.Resampling.LANCZOS).save(target, 'WEBP', quality=90)
    client.delete('/session/data').raise_for_status()
    print('Catalog preview generated from the actual image renderer.')
