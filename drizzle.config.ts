import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './supabase/schema/*.ts',
  out: './supabase/migrations',
  migrations: {
    prefix: 'supabase',
  },
});
