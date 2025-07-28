import { Router } from 'express';
import { promptsRouter } from './prompts';
import { competitorsRouter } from './competitors';
import { sourcesRouter } from './sources';
import { healthRouter } from './health';
import { userRouter } from './user';
import { publicRouter } from './public';
import { mentionsRouter } from './mentions';
import authRouter from './auth';

const router = Router();

// Public routes (no authentication required)
router.use('/health', healthRouter);
router.use('/public', publicRouter);
router.use('/auth', authRouter);

// Protected routes (authentication required)
router.use('/prompts', promptsRouter);
router.use('/competitors', competitorsRouter);
router.use('/sources', sourcesRouter);
router.use('/user', userRouter);
router.use('/mentions', mentionsRouter);

export default router;
