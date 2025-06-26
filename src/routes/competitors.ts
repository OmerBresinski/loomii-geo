import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, uuidParamSchema } from '../middleware/validation';
import * as competitorsController from '../controllers/competitorsController';

const router = Router();

// GET /api/competitors - Get all competitors with history data
router.get('/', asyncHandler(competitorsController.getCompetitors));

// GET /api/competitors/:id - Get competitor by ID
router.get(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(competitorsController.getCompetitorById)
);

// GET /api/competitors/:id/history - Get competitor with history data
router.get(
  '/:id/history',
  validate(uuidParamSchema),
  asyncHandler(competitorsController.getCompetitorWithHistory)
);

// POST /api/competitors - Create new competitor
router.post('/', asyncHandler(competitorsController.createCompetitor));

// PUT /api/competitors/:id - Update competitor
router.put(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(competitorsController.updateCompetitor)
);

// DELETE /api/competitors/:id - Delete competitor
router.delete(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(competitorsController.deleteCompetitor)
);

// POST /api/competitors/:id/history - Add history entry
router.post(
  '/:id/history',
  validate(uuidParamSchema),
  asyncHandler(competitorsController.addHistoryEntry)
);

export default router;
