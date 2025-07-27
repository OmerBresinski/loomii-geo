import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';

// Extend Request interface to include user and organization information
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId?: string;
        email?: string;
        organization?: {
          id: string;
        };
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  organizationId: string;
  email: string;
}

// JWT auth middleware that verifies tokens
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { organization: true }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      organization: {
        id: user.organizationId,
      },
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

// Optional auth middleware - sets auth if token is provided, continues if not
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { organization: true }
    });

    if (user) {
      req.auth = {
        userId: user.id,
        email: user.email,
        organization: {
          id: user.organizationId,
        },
      };
    }

    next();
  } catch (error) {
    next();
  }
};
