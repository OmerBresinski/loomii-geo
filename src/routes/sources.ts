import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  validate,
  sourcesQuerySchema,
  uuidParamSchema,
} from '../middleware/validation';
import * as sourcesController from '../controllers/sourcesController';

const router = Router();

// GET /api/sources - Get all sources with optional filtering
router.get(
  '/',
  validate(sourcesQuerySchema),
  asyncHandler(sourcesController.getSources)
);

// GET /api/sources/:id - Get source by ID
router.get(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(sourcesController.getSourceById)
);

// GET /api/sources/:id/details - Get source with details
router.get(
  '/:id/details',
  validate(uuidParamSchema),
  asyncHandler(sourcesController.getSourceWithDetails)
);

// POST /api/sources - Create new source
router.post('/', asyncHandler(sourcesController.createSource));

// PUT /api/sources/:id - Update source
router.put(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(sourcesController.updateSource)
);

// DELETE /api/sources/:id - Delete source
router.delete(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(sourcesController.deleteSource)
);

// POST /api/sources/:id/details - Add source detail
router.post(
  '/:id/details',
  validate(uuidParamSchema),
  asyncHandler(sourcesController.addSourceDetail)
);

// PUT /api/sources/:id/details/:detailId - Update source detail
router.put(
  '/:id/details/:detailId',
  validate(uuidParamSchema),
  asyncHandler(sourcesController.updateSourceDetail)
);

// DELETE /api/sources/:id/details/:detailId - Delete source detail
router.delete(
  '/:id/details/:detailId',
  validate(uuidParamSchema),
  asyncHandler(sourcesController.deleteSourceDetail)
);

export default router;
