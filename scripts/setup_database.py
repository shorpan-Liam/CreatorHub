"""Prepare project databases on existing PostgreSQL using PGUSER/PGPASSWORD.
Never prints or persists administrator credentials; never resets existing roles.
"""
import os
from pathlib import Path
import secrets
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    if (ROOT / 'backend/.env').exists():
        print('Existing backend/.env retained. Run migrations with that connection.')
        return
    if not os.environ.get('PGPASSWORD'):
        raise SystemExit('Set PGPASSWORD and PGUSER before initialization.')
    port = os.environ.get('PGPORT', '5432')
    user = os.environ.get('PGUSER', 'postgres')
    host = os.environ.get('PGHOST', '127.0.0.1')
    command = ['psql', '-h', host, '-p', port, '-U', user, '-d', 'postgres', '-w', '-At', '-v', 'ON_ERROR_STOP=1']

    def sql(statement):
        result = subprocess.run(command, input=statement, capture_output=True, text=True, env=os.environ.copy(), timeout=20)
        if result.returncode:
            raise RuntimeError('Database initialization failed; verify administrator access. No credentials printed.')
        return result.stdout.strip()

    if sql("SELECT rolname FROM pg_roles WHERE rolname='creatorhub_app';"):
        raise SystemExit('creatorhub_app already exists. Configure backend/.env with existing credentials; its password was not changed.')
    if sql("SELECT datname FROM pg_database WHERE datname IN ('creatorhub','creatorhub_test');"):
        raise SystemExit('Database names already exist. Configure their connection manually; no changes made.')
    app_password = secrets.token_urlsafe(32)
    sql(f"CREATE ROLE creatorhub_app LOGIN PASSWORD '{app_password}';")
    for name in ('creatorhub', 'creatorhub_test'):
        sql(f'CREATE DATABASE {name} OWNER creatorhub_app;')
    url = f'postgresql+psycopg://creatorhub_app:{app_password}@{host}:{port}'
    (ROOT / 'backend/.env').write_text(f'DATABASE_URL={url}/creatorhub\nTEST_DATABASE_URL={url}/creatorhub_test\nAPI_PORT=8000\nRENDER_BASE_URL=http://127.0.0.1:8000/_render\n', encoding='utf-8')
    print(f'CreatorHub databases ready on {host}:{port}. App credentials saved only in backend/.env.')


if __name__ == '__main__':
    main()
