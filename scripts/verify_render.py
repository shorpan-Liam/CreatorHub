"""Exercise actual API/worker output with generated, disposable test articles."""
import hashlib
import io
import json
from pathlib import Path
import sys
import time
import uuid
import zipfile

import httpx
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.schemas import Layout, Brand
from app.db import Session
from app.models import Job

BASE = 'http://127.0.0.1:8000/api/v1'


def body(text, kind='paragraph', **extra):
    return {'id': str(uuid.uuid4()), 'type': kind, 'runs': [{'text': text, 'bold': False}], **extra}


def run_case(name, title, blocks, height=1440, fmt='png', logo=False, expected_error=None):
    with httpx.Client(base_url=BASE, timeout=20, trust_env=False) as client:
        client.post('/session').raise_for_status()
        brand = Brand().model_dump()
        if logo:
            image = Image.new('RGB', (120, 120), '#70845b')
            stream = io.BytesIO(); image.save(stream, 'PNG')
            response = client.post('/assets', files={'file': ('test-logo.png', stream.getvalue(), 'image/png')})
            response.raise_for_status()
            brand.update(showLogo=True, logoAssetId=response.json()['id'])
        layout = Layout().model_dump()
        layout.update(height=height, preset='portrait-9-16' if height == 1920 else 'portrait-3-4')
        payload = {'schemaVersion': 1, 'draftId': str(uuid.uuid4()), 'revision': 1,
                   'document': {'title': title, 'sourceFormat': 'plain', 'sourceText': '', 'blocks': blocks},
                   'brand': brand, 'layout': layout, 'output': {'format': fmt}}
        start = time.monotonic()
        response = client.post('/renders', json=payload, headers={'Idempotency-Key': str(uuid.uuid4())})
        response.raise_for_status(); job_id = response.json()['id']
        result = response.json()
        while result['status'] in ('queued', 'running', 'cancel_requested'):
            if time.monotonic() - start > 210:
                raise AssertionError(f'{name}: timeout')
            time.sleep(.5)
            response = client.get(f'/renders/{job_id}'); response.raise_for_status(); result = response.json()
        if expected_error:
            assert result['status'] == 'failed' and result['error']['code'] == expected_error, result
            return {'case': name, 'status': 'passed', 'expectedError': expected_error}
        assert result['status'] == 'succeeded', result
        with Session() as db:
            manifest = db.get(Job, job_id).layout_manifest
            for block in blocks:
                if block['type'] == 'page_break': continue
                parts = [f for p in manifest['pages'] for f in p['fragments'] if f['blockId'] == block['id']]
                end = 0
                for part in parts:
                    assert part['startUtf16'] == end
                    end = part['endUtf16']
                expected = len(''.join(r['text'] for r in block['runs']).encode('utf-16-le')) // 2
                assert end == expected, (name, end, expected)
        archive = client.get(f'/renders/{job_id}/archive'); archive.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(archive.content)) as z:
            assert len(z.namelist()) == len(result['outputs'])
            for index, filename in enumerate(z.namelist(), 1):
                item = client.get(f'/renders/{job_id}/pages/{index}'); item.raise_for_status()
                assert hashlib.sha256(item.content).digest() == hashlib.sha256(z.read(filename)).digest()
                with Image.open(io.BytesIO(item.content)) as img:
                    assert img.size == (1080, height)
                    assert img.format == ('PNG' if fmt == 'png' else 'JPEG')
        return {'case': name, 'status': 'passed', 'pages': len(result['outputs']), 'seconds': round(time.monotonic() - start, 2), 'jobId': job_id}


def main():
    long_text = ('认真表达，也照顾读者的阅读节奏。分页应当完整保留中文、英文 QA、数字 123 和组合字符 \U0001f469\u200d\U0001f4bb。' * 55)
    cases = [
        ('long-single-paragraph', '长段落分页验证', [body(long_text)], 1440, 'png', False, None),
        ('jpeg-logo-tall', '有署名的高版图片', [body('标题与正文一起出现', 'heading', level=2)] + [body('把文字留在清晰的位置。' * 13) for _ in range(5)], 1920, 'jpeg', True, None),
        ('manual-breaks', '明确的分页', [body('第一段'), {'id': 'p1', 'type': 'page_break', 'runs': []}, {'id': 'p2', 'type': 'page_break', 'runs': []}, body('第二段'), {'id': 'p3', 'type': 'page_break', 'runs': []}], 1440, 'png', False, None),
        ('title-only', '只有标题，也可以。', [], 1440, 'png', False, None),
        ('title-overflow', '非常长的标题' * 16, [body('正文')], 1440, 'png', False, 'TITLE_OVERFLOW'),
    ]
    reports = []
    for case in cases:
        report = run_case(*case); reports.append(report); print(json.dumps(report, ensure_ascii=True), flush=True)
    (ROOT / 'storage/render-verification.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
