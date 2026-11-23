import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { connectDatabase } from './server/src/config/db';
import { createApiApp, markDemoSeeded } from './server/src/app';
import { seedDemoData } from './server/src/seed/seedDemoData';
import {
  seedDemoBreachRecords,
  validateBreachDatasetOnStartup,
} from './server/src/services/demoBreachService.js';

async function bootstrap() {
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  const datasetMeta = validateBreachDatasetOnStartup();
  console.log(
    `[Dataset] Validated ${datasetMeta.dataset_name} (${datasetMeta.record_count} synthetic records)`
  );

  try {
    await connectDatabase();
    await seedDemoData();
    await seedDemoBreachRecords();
    markDemoSeeded();
  } catch (err) {
    console.error(
      '[Server] Startup warning: MongoDB Atlas connection failed. API endpoints will return HTTP 503 until MongoDB is reachable (no local JSON fallback is enabled):',
      err instanceof Error ? err.message : err
    );
  }

  const app = createApiApp();

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Digital Footprint Visualizer running on http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
