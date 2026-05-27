import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'vault.db'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  bcryptRounds: 12,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
