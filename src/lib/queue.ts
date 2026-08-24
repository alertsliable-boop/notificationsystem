import { Queue } from 'bullmq';

export const smsFanoutQueue: Queue | null = null;

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
