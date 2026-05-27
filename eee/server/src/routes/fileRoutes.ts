import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import * as fileController from '../controllers/fileController';

const router = Router();
router.use(authMiddleware);

// 上传
router.post('/upload', upload.single('file'), fileController.uploadFile);

// 列表
router.get('/', fileController.listFiles);

// 单个文件
router.get('/:id', fileController.getFile);
router.get('/:id/download', fileController.downloadFile);
router.delete('/:id', fileController.deleteFile);

export default router;
