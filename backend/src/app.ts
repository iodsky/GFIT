import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';

export const createApp = (allowedOrigin = config.corsAllowedOrigin) => {
	const app = new Hono();

	app.use('*', cors({ origin: allowedOrigin }));

	app.onError((_error, context) => context.json({ error: 'Internal Server Error' }, 500));
	app.notFound((context) => context.json({ error: 'Not Found' }, 404));

	app.get('/health', (context) => context.json({ status: 'ok' }));

	return app;
};

export const app = createApp();