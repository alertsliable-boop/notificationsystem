import { Queue } from 'bullmq';

const hasRedis = !!process.env.REDIS_HOST || !!process.env.REDIS_URL;

const redisConnection = hasRedis ? {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => {
    if (times > 3) return null; // STOP retrying after 3 times!
    return Math.min(times * 200, 2000);
  },
} : undefined;

// Main SMS fanout queue
export const smsFanoutQueue = hasRedis ? new Queue('sms-fanout', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
}) : null;

if (smsFanoutQueue) {
  smsFanoutQueue.on('error', (err: any) => {
    if (err?.code === 'ECONNREFUSED') return;
    console.warn('[BullMQ Queue Warning]', err.message);
  });
}

// Add a job to send SMS for a notification
export async function enqueueSmsJob(notificationId: string, endpointId: string) {
  if (!smsFanoutQueue) {
    return null; // Fast fallback to direct sending if no Redis is configured
  }
  
  try {
    return await smsFanoutQueue.add(
      'send-sms',
      { notificationId, endpointId },
      { jobId: `sms-${notificationId}` }
    );
  } catch (error: any) {
    console.warn(`[SMS Queue Warning] Redis unavailable — unable to enqueue SMS for notification ${notificationId}:`, error.message);
    return null;
  }
}
