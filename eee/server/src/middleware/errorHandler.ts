import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err);

  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: '文件大小超过限制' });
    return;
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: '文件大小超过限制' });
    return;
  }

  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
  });
}
