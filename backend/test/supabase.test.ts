import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSupabaseServerClient } from '../src/supabase.js';

describe('server-side Supabase client', () => {
  it('creates a client with server credentials without enabling session persistence', () => {
    const client = createSupabaseServerClient({
      url: 'https://project.supabase.test',
      serviceRoleKey: 'test-service-role-key',
    });

    assert.equal(Reflect.get(client, 'supabaseUrl'), 'https://project.supabase.test');
    assert.equal(Reflect.get(client, 'supabaseKey'), 'test-service-role-key');
    assert.equal(Reflect.get(client.auth, 'autoRefreshToken'), false);
    assert.equal(Reflect.get(client.auth, 'detectSessionInUrl'), false);
    assert.equal(Reflect.get(client.auth, 'persistSession'), false);
  });

  it('fails safely when server credentials are not configured', () => {
    assert.throws(
      () => createSupabaseServerClient(null),
      /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});