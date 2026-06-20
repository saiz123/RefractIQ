import { serve } from '@hono/node-server';
import { app } from './app.js';

const PORT = Number(process.env['PORT'] ?? 3001);

console.log(`RefractIQ API running at http://localhost:${PORT}`);

serve({ fetch: app.fetch, port: PORT });
