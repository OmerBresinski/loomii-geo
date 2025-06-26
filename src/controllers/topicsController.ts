import { Request, Response } from 'express';
import { ApiResponse, TopicsQuery } from '../types';
import * as topicsService from '../services/topicsService';

export const getTopics = async (req: Request, res: Response): Promise<void> => {
  const query: TopicsQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 25,
    status: req.query.status ? req.query.status === 'true' : undefined,
  };

  const result = await topicsService.findAllTopics(query);

  const response: ApiResponse = {
    success: true,
    data: result,
    message: 'Topics retrieved successfully',
  };

  res.json(response);
};

export const getTopicById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const topic = await topicsService.findTopicById(id);

  const response: ApiResponse = {
    success: true,
    data: topic,
    message: 'Topic retrieved successfully',
  };

  res.json(response);
};

export const createTopic = async (
  req: Request,
  res: Response
): Promise<void> => {
  const topic = await topicsService.createTopic(req.body);

  const response: ApiResponse = {
    success: true,
    data: topic,
    message: 'Topic created successfully',
  };

  res.status(201).json(response);
};

export const updateTopic = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const topic = await topicsService.updateTopic(id, req.body);

  const response: ApiResponse = {
    success: true,
    data: topic,
    message: 'Topic updated successfully',
  };

  res.json(response);
};

export const deleteTopic = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  await topicsService.deleteTopic(id);

  const response: ApiResponse = {
    success: true,
    message: 'Topic deleted successfully',
  };

  res.json(response);
};
