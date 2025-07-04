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
  if (req.auth) {
    response.authenticatedUser = {
      userId: req.auth.userId,
      email: req.auth.user?.email,
      name: `${req.auth.user?.firstName} ${req.auth.user?.lastName}`.trim(),
    };
  } else {
    response.message += ' (not authenticated)';
  }

  res.json(response);
});

export { router as publicRouter };
