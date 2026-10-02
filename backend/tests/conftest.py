import os
from pathlib import Path
from datetime import timedelta

import pytest
from dotenv import dotenv_values
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
values = dotenv_values(ROOT / 'backend/.env')
test_url = values.get('TEST_DATABASE_URL')
if not test_url or make_url(test_url).database != 'creatorhub_test':
    raise RuntimeError('Tests require the dedicated creatorhub_test database')
os.environ['DATABASE_URL'] = test_url
os.environ['STORAGE_ROOT'] = str(ROOT / 'storage/test-files')

from app.db import Base, engine, Session, now
from app.models import Job, WorkerHeartbeat, uid
from app.seed import seed
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope='session', autouse=True)
def database():
    Base.metadata.create_all(engine)
    seed()


@pytest.fixture
def client():
    with Session() as db:
        db.add(WorkerHeartbeat(worker_id=uid(), last_seen_at=now()))
        db.commit()
    with TestClient(app) as c:
        assert c.post('/api/v1/session').status_code == 204
        yield c
    with Session() as db:
        # This database is dedicated to disposable test cases, never the app database.
        for job in db.query(Job).filter(Job.status.in_(('queued', 'running', 'cancel_requested'))):
            job.status = 'cancelled'
            job.finished_at = now()
            job.expires_at = now() - timedelta(seconds=1)
        db.commit()


@pytest.fixture
def payload():
    from app.schemas import Layout, Brand
    return {
        'schemaVersion': 1, 'draftId': uid(), 'revision': 1,
        'document': {'title': '测试文章', 'sourceFormat': 'plain', 'sourceText': '完整保留正文。',
                     'blocks': [{'id': 'b1', 'type': 'paragraph', 'runs': [{'text': '完整保留正文。', 'bold': False}]}]},
        'brand': Brand().model_dump(), 'layout': Layout().model_dump(), 'output': {'format': 'png'},
    }
