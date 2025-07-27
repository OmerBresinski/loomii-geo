import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../utils/database';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: {
        user,
        organization: user.organization,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as userRouter };
