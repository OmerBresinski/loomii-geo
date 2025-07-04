import { Router } from 'express';
import { analyticsRouter } from './analytics';
import { competitorsRouter } from './competitors';
import { sourcesRouter } from './sources';
import { healthRouter } from './health';
import { userRouter } from './user';
import { publicRouter } from './public';

const router = Router();

// Public routes (no authentication required)
router.use('/health', healthRouter);
router.use('/public', publicRouter);

// Protected routes (authentication required)
router.use('/analytics', analyticsRouter);
router.use('/competitors', competitorsRouter);
router.use('/sources', sourcesRouter);
router.use('/user', userRouter);

export default router;
