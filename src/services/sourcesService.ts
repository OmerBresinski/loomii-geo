import { prisma } from '../utils/database';
import { NotFoundError } from '../utils/errors';
import { SourcesQuery } from '../types';

export const findAllSources = async (query: SourcesQuery = {}) => {
  const { yaelOnly } = query;

  const where = yaelOnly ? { yaelGroupMentions: { gt: 0 } } : {};

  const sources = await prisma.source.findMany({
    where,
    include: {
      details: true,
    },
    orderBy: { totalMentions: 'desc' },
  });

  return sources;
};

export const findSourceById = async (id: string) => {
  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      details: true,
    },
  });

  if (!source) {
    throw new NotFoundError('Source');
  }

  return source;
};

export const findSourceWithDetails = async (id: string) => {
  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      details: {
        orderBy: { totalMentions: 'desc' },
      },
    },
  });

  if (!source) {
    throw new NotFoundError('Source');
  }

  return source;
};

export const createSource = async (data: {
  source: string;
  baseUrl: string;
  yaelGroupMentions?: number;
  competitionMentions?: number;
  totalMentions?: number;
}) => {
  return await prisma.source.create({
    data,
    include: {
      details: true,
    },
  });
};

export const updateSource = async (
  id: string,
  data: {
    source?: string;
    baseUrl?: string;
    yaelGroupMentions?: number;
    competitionMentions?: number;
    totalMentions?: number;
  }
) => {
  const existingSource = await prisma.source.findUnique({ where: { id } });

  if (!existingSource) {
    throw new NotFoundError('Source');
  }

  return await prisma.source.update({
    where: { id },
    data,
    include: {
      details: true,
    },
  });
};

export const deleteSource = async (id: string) => {
  const existingSource = await prisma.source.findUnique({ where: { id } });

  if (!existingSource) {
    throw new NotFoundError('Source');
  }

  return await prisma.source.delete({
    where: { id },
  });
};

export const addSourceDetail = async (data: {
  sourceId: string;
  url: string;
  yaelGroupMentions?: number;
  competitionMentions?: number;
  totalMentions?: number;
}) => {
  const source = await prisma.source.findUnique({
    where: { id: data.sourceId },
  });

  if (!source) {
    throw new NotFoundError('Source');
  }

  return await prisma.sourceDetail.create({
    data,
  });
};

export const updateSourceDetail = async (
  id: string,
  data: {
    url?: string;
    yaelGroupMentions?: number;
    competitionMentions?: number;
    totalMentions?: number;
  }
) => {
  const existingDetail = await prisma.sourceDetail.findUnique({
    where: { id },
  });

  if (!existingDetail) {
    throw new NotFoundError('Source detail');
  }

  return await prisma.sourceDetail.update({
    where: { id },
    data,
  });
};

export const deleteSourceDetail = async (id: string) => {
  const existingDetail = await prisma.sourceDetail.findUnique({
    where: { id },
  });

  if (!existingDetail) {
    throw new NotFoundError('Source detail');
  }

  return await prisma.sourceDetail.delete({
    where: { id },
  });
};
