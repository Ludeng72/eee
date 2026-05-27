import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initDb, saveDb, closeDb } from './db/connection';
import { runMigrations } from './db/migrate';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import shareRoutes from './routes/shareRoutes';
import { authMiddleware } from './middleware/auth';
import { searchUsers as searchUsersHandler } from './controllers/shareController';

async function main() {
  await initDb();
  runMigrations();

  const app = express();

  // Security headers
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS
  app.use(cors({ origin: config.corsOrigin, credentials: true }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Save DB on write requests
  app.use((req, _res, next) => {
    _res.on('finish', () => {
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
        saveDb();
      }
    });
    next();
  });

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: '请求过于频繁，请稍后再试' },
  });

  // Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/shares', shareRoutes);
  app.get('/api/users/search', authMiddleware, searchUsersHandler);

  // Error handler
  app.use(errorHandler);

  const server = app.listen(config.port, () => {
    console.log(`[server] Encrypted Vault API running on http://localhost:${config.port}`);
  });

  // 优雅退出 — 防止 libuv 断言错误
  function shutdown(signal: string) {
    console.log(`[server] ${signal} received, shutting down...`);
    server.close(() => {
      saveDb();
      closeDb();
      process.exit(0);
    });
    // 3 秒超时强制退出
    setTimeout(() => process.exit(0), 3000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return app;
}

main().catch(err => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});

export { main };
