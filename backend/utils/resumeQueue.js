import Bull from 'bull';

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

export const resumeParseQueue = new Bull('resume-parse', redisConfig);

export const resumeScoreQueue = new Bull('resume-score', redisConfig);