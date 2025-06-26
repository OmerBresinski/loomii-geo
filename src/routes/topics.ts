import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  validate,
  topicsQuerySchema,
  uuidParamSchema,
} from '../middleware/validation';
import * as topicsController from '../controllers/topicsController';

const router = Router();

// GET /api/topics - Get all topics with optional filtering and pagination
router.get(
  '/',
  validate(topicsQuerySchema),
  asyncHandler(topicsController.getTopics)
);

// GET /api/topics/:id - Get topic by ID
router.get(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(topicsController.getTopicById)
);

// POST /api/topics - Create new topic
router.post('/', asyncHandler(topicsController.createTopic));

// PUT /api/topics/:id - Update topic
router.put(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(topicsController.updateTopic)
);

// DELETE /api/topics/:id - Delete topic
router.delete(
  '/:id',
  validate(uuidParamSchema),
  asyncHandler(topicsController.deleteTopic)
);

export default router;
