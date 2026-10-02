from app.main import app


def test_public_routes_and_typed_render_contract_are_preserved():
    schema = app.openapi()
    assert set(schema['paths']) == {
        '/api/v1/health/live', '/api/v1/health/ready', '/api/v1/tools',
        '/api/v1/templates', '/api/v1/session', '/api/v1/session/data',
        '/api/v1/assets', '/api/v1/assets/{asset_id}', '/api/v1/assets/{asset_id}/content',
        '/api/v1/renders', '/api/v1/renders/{job_id}', '/api/v1/renders/{job_id}/cancel',
        '/api/v1/renders/{job_id}/pages/{page}', '/api/v1/renders/{job_id}/archive',
    }
    response = schema['paths']['/api/v1/renders']['post']['responses']['202']['content']['application/json']['schema']
    assert response['$ref'].endswith('/JobResponse')


def test_render_and_validation_error_shapes(client, payload):
    response = client.post('/api/v1/renders', json=payload, headers={'Idempotency-Key': 'contract-test-' + payload['draftId']})
    assert response.status_code == 202
    job = response.json()
    assert {'revision', 'renderHash', 'expired', 'archiveUrl', 'outputs', 'progress', 'warnings', 'error'} <= job.keys()
    payload['layout']['paddingX'] = 321
    response = client.post('/api/v1/renders', json=payload, headers={'Idempotency-Key': payload['draftId']})
    assert response.status_code == 422
    assert set(response.json()['error']) == {'code', 'message', 'requestId'}
    assert response.json()['error']['requestId'] == response.headers['X-Request-ID']
