import { Router } from 'express';
import topicsRoutes from './topics';
import competitorsRoutes from './competitors';
import sourcesRoutes from './sources';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Loomii Geo API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/topics', topicsRoutes);
router.use('/competitors', competitorsRoutes);
router.use('/sources', sourcesRoutes);

export default router;
