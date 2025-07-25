import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include organization information
declare global {
  namespace Express {
    interface Request {
      auth?: {
        organization?: {
          id: string;
        };
      };
    }
  }
}

// Simple auth middleware that sets a hardcoded organization ID
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Hardcode the organization ID for Binance
  req.auth = {
    organization: {
      id: 'org_2zQ7HOteaRAEoKhViL1GK4Jcj4s',
    },
  };

  next();
};

// Optional middleware - same as requireAuth for now
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  req.auth = {
    organization: {
      id: 'org_2zQ7HOteaRAEoKhViL1GK4Jcj4s',
    },
  };

  next();
};
