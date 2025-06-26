import { prisma } from '../utils/database';
import { NotFoundError } from '../utils/errors';
import { TopicsQuery } from '../types';

export const findAllTopics = async (query: TopicsQuery = {}) => {
  const { page = 1, limit = 10, status } = query;
  const skip = (page - 1) * limit;

  const where = status !== undefined ? { status } : {};

  const [topics, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      include: {
        prompts: {
          include: {
            aiProviders: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.topic.count({ where }),
  ]);

  return {
    topics,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const findTopicById = async (id: string) => {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      prompts: {
        include: {
          aiProviders: true,
        },
      },
    },
  });

  if (!topic) {
    throw new NotFoundError('Topic');
  }

  return topic;
};

export const createTopic = async (data: {
  name: string;
  responseCount?: number;
  visibility?: number;
  sentimentPositive?: number;
  sentimentNeutral?: number;
  sentimentNegative?: number;
  status?: boolean;
}) => {
  return await prisma.topic.create({
    data,
    include: {
      prompts: {
        include: {
          aiProviders: true,
        },
      },
    },
  });
};

export const updateTopic = async (
  id: string,
  data: {
    name?: string;
    responseCount?: number;
    visibility?: number;
    sentimentPositive?: number;
    sentimentNeutral?: number;
    sentimentNegative?: number;
    status?: boolean;
  }
) => {
  const existingTopic = await prisma.topic.findUnique({ where: { id } });

  if (!existingTopic) {
    throw new NotFoundError('Topic');
  }

  return await prisma.topic.update({
    where: { id },
    data,
    include: {
      prompts: {
        include: {
          aiProviders: true,
        },
      },
    },
  });
};

export const deleteTopic = async (id: string) => {
  const existingTopic = await prisma.topic.findUnique({ where: { id } });

  if (!existingTopic) {
    throw new NotFoundError('Topic');
  }

  return await prisma.topic.delete({
    where: { id },
  });
};
