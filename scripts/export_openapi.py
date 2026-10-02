"""Export the API contract without running a server or querying PostgreSQL."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.main import app

path = ROOT / 'frontend/openapi.json'
path.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('OpenAPI contract exported.')
