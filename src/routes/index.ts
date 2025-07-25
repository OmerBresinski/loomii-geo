import { Router } from 'express';
import { promptsRouter } from './prompts';
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
router.use('/prompts', promptsRouter);
router.use('/competitors', competitorsRouter);
router.use('/sources', sourcesRouter);
router.use('/user', userRouter);

export default router;
