import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { app, createApp } from '../src/app.js';

describe('health endpoint', () => {
  it('returns an OK response', async () => {
    const response = await app.request('/health');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

describe('base middleware', () => {
  it('returns a JSON 404 for unknown paths', async () => {
    const response = await app.request('/missing');

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not Found' });
  });

  it('returns a generic JSON 500 for unhandled errors', async () => {
    const testApp = createApp();
    testApp.get('/failure', () => {
      throw new Error('internal detail');
    });

    const response = await testApp.request('/failure');

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Internal Server Error' });
  });

  it('allows only the configured CORS origin', async () => {
    const allowedOrigin = 'https://app.example.test';
    const testApp = createApp(allowedOrigin);
    const allowedResponse = await testApp.request('/health', {
      headers: { origin: allowedOrigin },
    });
    const deniedResponse = await testApp.request('/health', {
      headers: { origin: 'https://other.example.test' },
    });

    assert.equal(allowedResponse.headers.get('access-control-allow-origin'), allowedOrigin);
    assert.equal(deniedResponse.headers.get('access-control-allow-origin'), null);
  });
});