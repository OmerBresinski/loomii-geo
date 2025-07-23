import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

// Get current user profile
router.get('/profile', (req, res) => {
  // req.auth is populated by the authentication middleware
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  return res.json({
    success: true,
    data: {
      organization: req.auth.organization,
    },
  });
});

export { router as userRouter };
