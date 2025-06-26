import { Request, Response } from 'express';
import { ApiResponse, SourcesQuery } from '../types';
import * as sourcesService from '../services/sourcesService';

export const getSources = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query: SourcesQuery = {
    yaelOnly: req.query.yaelOnly === 'true',
  };

  const sources = await sourcesService.findAllSources(query);

  const response: ApiResponse = {
    success: true,
    data: sources,
    message: 'Sources retrieved successfully',
  };

  res.json(response);
};

export const getSourceById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const source = await sourcesService.findSourceById(id);

  const response: ApiResponse = {
    success: true,
    data: source,
    message: 'Source retrieved successfully',
  };

  res.json(response);
};

export const getSourceWithDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const source = await sourcesService.findSourceWithDetails(id);

  const response: ApiResponse = {
    success: true,
    data: source,
    message: 'Source with details retrieved successfully',
  };

  res.json(response);
};

export const createSource = async (
  req: Request,
  res: Response
): Promise<void> => {
  const source = await sourcesService.createSource(req.body);

  const response: ApiResponse = {
    success: true,
    data: source,
    message: 'Source created successfully',
  };

  res.status(201).json(response);
};

export const updateSource = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const source = await sourcesService.updateSource(id, req.body);

  const response: ApiResponse = {
    success: true,
    data: source,
    message: 'Source updated successfully',
  };

  res.json(response);
};

export const deleteSource = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  await sourcesService.deleteSource(id);

  const response: ApiResponse = {
    success: true,
    message: 'Source deleted successfully',
  };

  res.json(response);
};

export const addSourceDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const detailData = {
    sourceId: id,
    ...req.body,
  };

  const detail = await sourcesService.addSourceDetail(detailData);

  const response: ApiResponse = {
    success: true,
    data: detail,
    message: 'Source detail added successfully',
  };

  res.status(201).json(response);
};

export const updateSourceDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, detailId } = req.params;
  const detail = await sourcesService.updateSourceDetail(detailId, req.body);

  const response: ApiResponse = {
    success: true,
    data: detail,
    message: 'Source detail updated successfully',
  };

  res.json(response);
};

export const deleteSourceDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, detailId } = req.params;
  await sourcesService.deleteSourceDetail(detailId);

  const response: ApiResponse = {
    success: true,
    message: 'Source detail deleted successfully',
  };

  res.json(response);
};
