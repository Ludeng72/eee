import { Request, Response } from 'express';
import path from 'path';
import { config } from '../config';
import * as fileService from '../services/fileService';
import type { UploadFileFields } from '../../../shared/types';

export function uploadFile(req: Request, res: Response): void {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未上传文件' });
      return;
    }

    const fields: UploadFileFields = req.body;
    const file = fileService.createFile(req.userId!, req.file.filename, fields);
    res.status(201).json({ file });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || '上传失败' });
  }
}

export function listFiles(req: Request, res: Response): void {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const result = fileService.listFiles(req.userId!, page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export function getFile(req: Request, res: Response): void {
  try {
    const file = fileService.getFileById(req.params.id, req.userId!);
    res.json({ file });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export function downloadFile(req: Request, res: Response): void {
  try {
    const { storagePath, fileName } = fileService.getFilePath(req.params.id, req.userId!);
    const fullPath = path.join(config.uploadsDir, storagePath);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(fullPath);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export function deleteFile(req: Request, res: Response): void {
  try {
    fileService.deleteFile(req.params.id, req.userId!);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
