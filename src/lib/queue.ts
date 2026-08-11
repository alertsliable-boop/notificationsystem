import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false, // Prevents queuing infinite connection attempts when Redis is offline
  retryStrategy: (times: number) => {
    // Retry up to 3 times, then wait before retrying to prevent connection log spam
    if (times > 3) {
      return 10000; // Wait 10s between retries if Redis is down
    }
    return Math.min(times * 200, 2000);
  },
};

// Main SMS fanout queue
export const smsFanoutQueue = new Queue('sms-fanout', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

// Attach error listener to prevent unhandled ECONNREFUSED error console spam when Redis is offline
smsFanoutQueue.on('error', (err: any) => {
  if (err?.code === 'ECONNREFUSED') {
    // Silent catch — Redis is offline or not configured on 127.0.0.1:6379
    return;
  }
  console.warn('[BullMQ Queue Warning]', err.message);
});

// Add a job to send SMS for a notification
export async function enqueueSmsJob(notificationId: string, endpointId: string) {
  try {
    return await smsFanoutQueue.add(
      'send-sms',
      { notificationId, endpointId },
      { jobId: `sms-${notificationId}` } // deduplicate by notificationId
    );
  } catch (error: any) {
    console.warn(`[SMS Queue Warning] Redis unavailable — unable to enqueue SMS for notification ${notificationId}:`, error.message);
    return null;
  }
}
