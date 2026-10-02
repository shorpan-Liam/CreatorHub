import importlib.util
from pathlib import Path
import uuid

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect
from app.db import engine


def test_initial_migration_replays_without_current_model_dependency():
    path = Path(__file__).resolve().parents[1] / 'migrations/versions/0001_initial.py'
    spec = importlib.util.spec_from_file_location('initial_schema', path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    schema = 'migration_check_' + uuid.uuid4().hex
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
            connection.exec_driver_sql(f'SET LOCAL search_path TO "{schema}"')
            with Operations.context(MigrationContext.configure(connection)):
                migration.upgrade()
            assert set(inspect(connection).get_table_names(schema=schema)) == {
                'tools', 'templates', 'anonymous_sessions', 'assets', 'render_jobs',
                'render_job_assets', 'render_outputs', 'worker_heartbeats',
            }
        finally:
            transaction.rollback()  # Only the new, isolated schema existed in this transaction.
