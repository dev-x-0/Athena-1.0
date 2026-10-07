from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)
r = client.post('/auth/register', json={'username':'healthcheck_user','password':'healthcheck123'})
if r.status_code not in (200, 409):
    raise SystemExit(f'Auth check failed: {r.status_code} {r.text}')
if r.status_code == 409:
    r = client.post('/auth/login', json={'username':'healthcheck_user','password':'healthcheck123'})

token = r.json()['token']
h = {'Authorization': f'Bearer {token}'}
for path in ['/auth/me', '/analyses', '/references', '/api/dashboard', '/api/inventory']:
    x = client.get(path, headers=h)
    if x.status_code != 200:
        raise SystemExit(f'{path} failed: {x.status_code} {x.text}')
print('ATHENA BACKEND CHECK: PASS')
