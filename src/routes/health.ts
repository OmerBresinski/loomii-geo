import { Router } from 'express';

const router = Router();

// Health check endpoint - no authentication required
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Loomii Geo API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

export { router as healthRouter };
