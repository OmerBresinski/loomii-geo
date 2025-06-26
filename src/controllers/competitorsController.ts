import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import * as competitorsService from '../services/competitorsService';

export const getCompetitors = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await competitorsService.findAllCompetitors();

  const response: ApiResponse = {
    success: true,
    data: result,
    message: 'Competitors retrieved successfully',
  };

  res.json(response);
};

export const getCompetitorById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const competitor = await competitorsService.findCompetitorById(id);

  const response: ApiResponse = {
    success: true,
    data: competitor,
    message: 'Competitor retrieved successfully',
  };

  res.json(response);
};

export const getCompetitorWithHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const months = parseInt(req.query.months as string) || 6;

  const competitor = await competitorsService.getCompetitorWithHistory(
    id,
    months
  );

  const response: ApiResponse = {
    success: true,
    data: competitor,
    message: 'Competitor with history retrieved successfully',
  };

  res.json(response);
};

export const createCompetitor = async (
  req: Request,
  res: Response
): Promise<void> => {
  const competitor = await competitorsService.createCompetitor(req.body);

  const response: ApiResponse = {
    success: true,
    data: competitor,
    message: 'Competitor created successfully',
  };

  res.status(201).json(response);
};

export const updateCompetitor = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const competitor = await competitorsService.updateCompetitor(id, req.body);

  const response: ApiResponse = {
    success: true,
    data: competitor,
    message: 'Competitor updated successfully',
  };

  res.json(response);
};

export const deleteCompetitor = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  await competitorsService.deleteCompetitor(id);

  const response: ApiResponse = {
    success: true,
    message: 'Competitor deleted successfully',
  };

  res.json(response);
};

export const addHistoryEntry = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const historyData = {
    competitorId: id,
    ...req.body,
  };

  const history =
    await competitorsService.addCompetitorHistoryEntry(historyData);

  const response: ApiResponse = {
    success: true,
    data: history,
    message: 'History entry added successfully',
  };

  res.status(201).json(response);
};
