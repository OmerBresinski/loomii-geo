import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { UnauthorizedError } from '../utils/errors';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        user?: any;
      };
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get the session token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No valid authorization header found');
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    // Verify the session token with Clerk
    const session = await clerkClient.sessions.verifySession(
      sessionToken,
      process.env.CLERK_SECRET_KEY
    );

    if (!session) {
      throw new UnauthorizedError('Invalid session token');
    }

    // Get user information
    const user = await clerkClient.users.getUser(session.userId);

    // Attach user info to request
    req.auth = {
      userId: session.userId,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const sessionToken = authHeader.substring(7);

    if (!process.env.CLERK_SECRET_KEY) {
      console.warn('CLERK_SECRET_KEY is not configured');
      return next();
    }

    const session = await clerkClient.sessions.verifySession(
      sessionToken,
      process.env.CLERK_SECRET_KEY
    );

    if (session) {
      const user = await clerkClient.users.getUser(session.userId);

      req.auth = {
        userId: session.userId,
        sessionId: session.id,
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
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
