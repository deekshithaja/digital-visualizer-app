import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import targetRoutes from './routes/targetRoutes';
import findingRoutes from './routes/findingRoutes';
import actionRoutes from './routes/actionRoutes';
import reportRoutes from './routes/reportRoutes';
import breachRoutes from './routes/breachRoutes';
import { errorMiddleware, notFoundHandler } from './middleware/errorMiddleware';
import {
  TARGET_DB_NAME,
  ensureDatabaseConnected,
  getConnectedDatabaseName,
  getDatabaseError,
  isMongoConnected,
} from './config/db';
import { seedDemoData } from './seed/seedDemoData';
import { seedBreachesDataset } from './services/demoBreachService';

let demoSeedAttempted = false;

async function ensureSeededOnce(): Promise<void> {
  if (demoSeedAttempted || !isMongoConnected()) return;
  demoSeedAttempted = true;
  try {
    await seedDemoData();
    await seedBreachesDataset();
  } catch (err) {
    demoSeedAttempted = false;
    console.error('[Seed] Failed to seed demo workspace or breach dataset:', err);
  }
}

export function markDemoSeeded(): void {
  demoSeedAttempted = true;
}

export function createApiApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    if (!isMongoConnected()) {
      await ensureDatabaseConnected();
    }
    const connected = isMongoConnected();
    if (connected) {
      await ensureSeededOnce();
    }
    res.status(connected ? 200 : 503).json({
      status: connected ? 'ok' : 'unavailable',
      storage: 'mongodb',
      database: getConnectedDatabaseName(),
      connected,
      ...(connected ? {} : { error: getDatabaseError() || 'MongoDB connection is not active.' }),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', async (_req, res, next) => {
    if (!isMongoConnected()) {
      const result = await ensureDatabaseConnected();
      if (!result.connected) {
        res.status(503).json({
          error: `MongoDB Atlas connection failed for "${TARGET_DB_NAME}". ${result.error || getDatabaseError() || 'Please check MONGODB_URI and Atlas Network Access IP whitelist.'}`,
        });
        return;
      }
      await ensureSeededOnce();
    }
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/targets', targetRoutes);
  app.use('/api/findings', findingRoutes);
  app.use('/api/actions', actionRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/breaches', breachRoutes);
  app.use('/api/v1/breaches', breachRoutes);

  app.use('/api', notFoundHandler);
  app.use(errorMiddleware);

  return app;
}
