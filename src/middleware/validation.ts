import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errorMessages = result.error.issues.map(
          err => `${err.path.join('.')}: ${err.message}`
        );
        throw new ValidationError(
          `Validation failed: ${errorMessages.join(', ')}`
        );
      }

      // Attach validated data to request
      const validatedData = result.data as any;
      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Common validation schemas
export const paginationSchema = z.object({
  query: z
    .object({
      page: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 1)),
      limit: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 10)),
    })
    .optional(),
});

export const topicsQuerySchema = z.object({
  query: z
    .object({
      page: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 1)),
      limit: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 10)),
      status: z
        .string()
        .optional()
        .transform(val => val === 'true'),
    })
    .optional(),
});

export const sourcesQuerySchema = z.object({
  query: z
    .object({
      yaelOnly: z
        .string()
        .optional()
        .transform(val => val === 'true'),
    })
    .optional(),
});

export const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid UUID format'),
  }),
});
