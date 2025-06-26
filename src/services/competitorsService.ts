import { prisma } from '../utils/database';
import { NotFoundError } from '../utils/errors';
import { CompetitorsResponse } from '../types';

export const findAllCompetitors = async (): Promise<CompetitorsResponse> => {
  const competitors = await prisma.competitor.findMany({
    include: {
      historyData: {
        where: {
          date: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 6)), // Last 6 months
          },
        },
        orderBy: { date: 'asc' },
      },
    },
    orderBy: { visibility: 'desc' },
  });

  // Extract all history data for the response
  const competitorHistory = competitors.flatMap(competitor =>
    competitor.historyData.map(history => ({
      ...history,
      competitor: {
        id: competitor.id,
        name: competitor.name,
        rank: competitor.rank,
        sentimentPositive: competitor.sentimentPositive,
        sentimentNeutral: competitor.sentimentNeutral,
        sentimentNegative: competitor.sentimentNegative,
        visibility: competitor.visibility,
        visibilityChange: competitor.visibilityChange,
        favicon: competitor.favicon,
        createdAt: competitor.createdAt,
        updatedAt: competitor.updatedAt,
      },
    }))
  );

  return {
    competitors: competitors.map(competitor => ({
      ...competitor,
      favicon: competitor.favicon ?? undefined,
    })),
    competitorHistory: competitorHistory.map(history => ({
      ...history,
      competitor: {
        ...history.competitor,
        favicon: history.competitor.favicon ?? undefined,
      },
    })),
  };
};

export const findCompetitorById = async (id: string) => {
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      historyData: {
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!competitor) {
    throw new NotFoundError('Competitor');
  }

  return competitor;
};

export const getCompetitorWithHistory = async (
  id: string,
  months: number = 6
) => {
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      historyData: {
        where: {
          date: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - months)),
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!competitor) {
    throw new NotFoundError('Competitor');
  }

  return competitor;
};

export const createCompetitor = async (data: {
  name: string;
  rank: number;
  sentimentPositive?: number;
  sentimentNeutral?: number;
  sentimentNegative?: number;
  visibility?: number;
  visibilityChange?: number;
  favicon?: string;
}) => {
  return await prisma.competitor.create({
    data,
    include: {
      historyData: true,
    },
  });
};

export const updateCompetitor = async (
  id: string,
  data: {
    name?: string;
    rank?: number;
    sentimentPositive?: number;
    sentimentNeutral?: number;
    sentimentNegative?: number;
    visibility?: number;
    visibilityChange?: number;
    favicon?: string;
  }
) => {
  const existingCompetitor = await prisma.competitor.findUnique({
    where: { id },
  });

  if (!existingCompetitor) {
    throw new NotFoundError('Competitor');
  }

  return await prisma.competitor.update({
    where: { id },
    data,
    include: {
      historyData: true,
    },
  });
};

export const deleteCompetitor = async (id: string) => {
  const existingCompetitor = await prisma.competitor.findUnique({
    where: { id },
  });

  if (!existingCompetitor) {
    throw new NotFoundError('Competitor');
  }

  return await prisma.competitor.delete({
    where: { id },
  });
};

export const addCompetitorHistoryEntry = async (data: {
  competitorId: string;
  date: Date;
  visibility: number;
}) => {
  const competitor = await prisma.competitor.findUnique({
    where: { id: data.competitorId },
  });

  if (!competitor) {
    throw new NotFoundError('Competitor');
  }

  return await prisma.competitorHistory.create({
    data,
  });
};
