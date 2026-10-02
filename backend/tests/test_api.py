import io
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import select

from app.db import Session, now
from app.main import app
from app.models import Job, uid
from app.schemas import Snapshot
from app.worker import claim, maintain, stage, RenderError


def submit(client, payload, key=None):
    return client.post('/api/v1/renders', json=payload, headers={'Idempotency-Key': key or uid()})


def test_catalog_and_live(client):
    assert client.get('/api/v1/health/live').json() == {'status': 'ok'}
    assert client.get('/api/v1/tools').json()['items'][0]['slug'] == 'article-to-images'


def test_idempotency_and_payload_conflict(client, payload):
    key = uid()
    first, second = submit(client, payload, key), submit(client, payload, key)
    assert first.status_code == 202
    assert first.json()['id'] == second.json()['id']
    payload['revision'] += 1
    assert submit(client, payload, key).status_code == 409


def test_cookie_and_cross_session_isolation(client, payload):
    cookie = client.cookies.get('creatorhub_session')
    assert cookie and len(cookie) >= 40
    job = submit(client, payload).json()
    with TestClient(app) as other:
        assert other.get(f"/api/v1/renders/{job['id']}").status_code == 401
        other.post('/api/v1/session')
        assert other.get(f"/api/v1/renders/{job['id']}").status_code == 404
        assert other.get(f"/api/v1/renders/{job['id']}/archive").status_code == 404
        assert other.post(f"/api/v1/renders/{job['id']}/cancel").status_code == 404


def test_cross_origin_rejected(client, payload):
    response = client.post('/api/v1/renders', json=payload, headers={'Origin': 'https://attacker.invalid', 'Idempotency-Key': uid()})
    assert response.status_code == 403


def test_capacity_and_cancel(client, payload):
    first = submit(client, payload).json()
    second = submit(client, payload)
    assert second.status_code == 202
    assert submit(client, payload).status_code == 429
    cancelled = client.post(f"/api/v1/renders/{first['id']}/cancel").json()
    assert cancelled['status'] == 'cancelled'
    assert client.post(f"/api/v1/renders/{first['id']}/cancel").json()['status'] == 'cancelled'
    assert client.get(f"/api/v1/renders/{first['id']}/archive").status_code == 409


def test_expired_result_does_not_download(client, payload):
    job = submit(client, payload).json()
    with Session() as db:
        record = db.get(Job, job['id'])
        record.status = 'succeeded'; record.expires_at = now() - timedelta(seconds=1)
        db.commit()
    assert client.get(f"/api/v1/renders/{job['id']}").json()['expired'] is True
    assert client.get(f"/api/v1/renders/{job['id']}/archive").status_code == 410


def test_logo_decode_and_isolation(client):
    data = io.BytesIO(); Image.new('RGB', (80, 80), '#485a32').save(data, 'PNG')
    result = client.post('/api/v1/assets', files={'file': ('logo.png', data.getvalue(), 'image/png')})
    assert result.status_code == 201
    url = result.json()['url']
    assert client.get(url).headers['content-type'] == 'image/png'
    with TestClient(app) as other:
        other.post('/api/v1/session')
        assert other.get(url).status_code == 404
    assert client.post('/api/v1/assets', files={'file': ('fake.png', b'<svg></svg>', 'image/png')}).status_code == 422


def test_body_limit(client):
    response = client.post('/api/v1/renders', content=b' ' * (2 * 1024**2 + 1), headers={'Content-Type': 'application/json'})
    assert response.status_code == 413


@pytest.mark.parametrize('mutation', ['empty', 'duplicate', 'title', 'body', 'preset', 'script', 'pagebreak'])
def test_snapshot_validation(payload, mutation):
    if mutation == 'empty': payload['document'].update(title='', blocks=[])
    if mutation == 'duplicate': payload['document']['blocks'] *= 2
    if mutation == 'title': payload['document']['title'] = '字' * 101
    if mutation == 'body': payload['document']['blocks'][0]['runs'][0]['text'] = '字' * 20001
    if mutation == 'preset': payload['layout']['height'] = 1920
    if mutation == 'script': payload['layout']['css'] = 'arbitrary script'
    if mutation == 'pagebreak': payload['document']['blocks'][0]['type'] = 'page_break'
    with pytest.raises(ValidationError): Snapshot.model_validate(payload)


def test_unicode_limits(payload):
    payload['document']['title'] = '\U0001f600' * 100
    assert len(Snapshot.model_validate(payload).document.title) == 100


def test_concurrent_claims_and_stale_lease(client, payload):
    job_id = submit(client, payload).json()['id']
    with ThreadPoolExecutor(max_workers=2) as pool:
        claimed = list(pool.map(claim, ['test-worker-a', 'test-worker-b']))
    owners = [j for j in claimed if j and j.id == job_id]
    assert len(owners) == 1
    old = owners[0]
    with Session() as db:
        current = db.get(Job, job_id)
        current.lease_expires_at = now() - timedelta(seconds=1)
        db.commit()
    maintain()
    new = claim('test-worker-c')
    assert new and new.id == job_id and new.lease_token != old.lease_token
    with pytest.raises(RenderError): stage(old, 'packaging')


def test_cancelled_running_job_is_not_retried(client, payload):
    job_id = submit(client, payload).json()['id']
    current = claim('cancel-worker')
    assert current.id == job_id
    assert client.post(f'/api/v1/renders/{job_id}/cancel').json()['status'] == 'cancel_requested'
    with Session() as db:
        db.get(Job, job_id).lease_expires_at = now() - timedelta(seconds=1)
        db.commit()
    maintain()
    assert client.get(f'/api/v1/renders/{job_id}').json()['status'] == 'cancelled'
