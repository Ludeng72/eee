import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as shareController from '../controllers/shareController';

const router = Router();
router.use(authMiddleware);

router.post('/', shareController.createShare);
router.get('/received', shareController.getReceivedShares);
router.get('/sent', shareController.getSentShares);
router.delete('/:id', shareController.deleteShare);

export default router;
