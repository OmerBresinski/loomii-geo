import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Apply optional authentication middleware
router.use(optionalAuth);

// Public endpoint that can optionally use user context
router.get('/info', (req, res) => {
  const response: any = {
    success: true,
    message: 'Public endpoint accessible to all users',
    timestamp: new Date().toISOString(),
  };

  // If user is authenticated, include their info
  if (req.auth?.organization) {
    response.authenticatedUser = {
      organizationId: req.auth.organization.id,
      organizationName: 'Binance',
    };
  } else {
    response.message += ' (not authenticated)';
  }

  res.json(response);
});

export { router as publicRouter };
