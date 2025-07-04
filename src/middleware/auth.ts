import { Request, Response, NextFunction } from 'express';
import {
  clerkMiddleware,
  requireAuth as clerkRequireAuth,
  getAuth,
} from '@clerk/express';
import { UnauthorizedError } from '../utils/errors';
import dotenv from 'dotenv';

dotenv.config();

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
        user?: any;
      };
    }
  }
}

// Initialize Clerk middleware
export const initClerkMiddleware = clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use Clerk's built-in auth checking
    const auth = getAuth(req);

    if (!auth.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Attach simplified auth info to request
    req.auth = {
      userId: auth.userId,
      sessionId: auth.sessionId,
      user: {
        id: auth.userId,
        // Note: For full user details, you'd need to fetch from Clerk
        // but for basic auth, the userId is sufficient
      },
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      console.error('Auth middleware error:', error);
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

// Optional middleware - doesn't throw error if no auth, but populates req.auth if token exists
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = getAuth(req);

    if (auth.userId) {
      req.auth = {
        userId: auth.userId,
        sessionId: auth.sessionId,
        user: {
          id: auth.userId,
        },
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without auth
    console.warn('Optional auth failed:', error);
    next();
  }
};
