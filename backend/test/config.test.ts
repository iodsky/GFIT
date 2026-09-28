import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../src/config.js';

describe('backend configuration', () => {
  it('uses safe defaults when optional variables are missing', () => {
    assert.deepEqual(loadConfig({}), {
      nodeEnv: 'development',
      port: 3000,
      corsAllowedOrigin: '',
      supabase: undefined,
    });
  });

  it('parses and normalizes valid configuration', () => {
    assert.deepEqual(
      loadConfig({
        NODE_ENV: 'production',
        PORT: '8080',
        CORS_ALLOWED_ORIGIN: 'https://app.example.test/',
        SUPABASE_URL: 'https://project.supabase.test',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      }),
      {
        nodeEnv: 'production',
        port: 8080,
        corsAllowedOrigin: 'https://app.example.test',
        supabase: {
          url: 'https://project.supabase.test',
          serviceRoleKey: 'test-service-role-key',
        },
      },
    );
  });

  it('rejects invalid ports without echoing their values', () => {
    assert.throws(
      () => loadConfig({ PORT: 'not-a-port' }),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.match(error.message, /PORT/);
        assert.doesNotMatch(error.message, /not-a-port/);
        return true;
      },
    );
  });

  it('rejects unsupported runtime modes', () => {
    assert.throws(() => loadConfig({ NODE_ENV: 'staging' }), /NODE_ENV/);
  });

  it('rejects invalid CORS origins', () => {
    assert.throws(
      () => loadConfig({ CORS_ALLOWED_ORIGIN: 'https://app.example.test/path' }),
      /CORS_ALLOWED_ORIGIN/,
    );
  });

  it('requires the Supabase URL and service-role key together without echoing the key', () => {
    const testKey = 'test-service-role-key';
    const incompleteConfigurations = [
      [{ SUPABASE_URL: 'https://project.supabase.test' }, 'SUPABASE_SERVICE_ROLE_KEY'],
      [{ SUPABASE_SERVICE_ROLE_KEY: testKey }, 'SUPABASE_URL'],
    ] as const;

    for (const [environment, expectedField] of incompleteConfigurations) {
      assert.throws(() => loadConfig(environment), (error: unknown) => {
        assert(error instanceof Error);
        assert.match(error.message, new RegExp(expectedField));
        assert.doesNotMatch(error.message, new RegExp(testKey));
        return true;
      });
    }
  });
});