import { serve } from '@hono/node-server';
import { app } from './app.js';
import { config } from './config.js';

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Backend listening on http://localhost:${info.port}`);
});