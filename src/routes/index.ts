import { Router } from 'express';
import { analyticsRouter } from './analytics';
import { competitorsRouter } from './competitors';
import { sourcesRouter } from './sources';

const router = Router();

router.use('/analytics', analyticsRouter);
router.use('/competitors', competitorsRouter);
router.use('/sources', sourcesRouter);

export default router;
