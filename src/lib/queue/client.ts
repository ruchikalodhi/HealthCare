import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const isRedisConfigured = !!redisUrl;

// Mock Queue implementation for local dev fallback
class MockQueue {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async add(jobName: string, data: any, opts?: any): Promise<any> {
    console.log(`[Queue Client: ${this.name}] Enqueued job "${jobName}" asynchronously.`);
    
    // Process the job asynchronously in the background using setTimeout
    setTimeout(async () => {
      try {
        const { processJobInline } = await import('./workers');
        console.log(`[Queue Worker Mock: ${this.name}] Executing job "${jobName}"...`);
        await processJobInline(this.name, jobName, data);
      } catch (err) {
        console.error(`[Queue Worker Mock: ${this.name}] Job failed:`, err);
      }
    }, 500);

    return { id: `mock-job-id-${this.name}-${Date.now()}` };
  }
}

let emailQueue: Queue | MockQueue;
let calendarQueue: Queue | MockQueue;

if (isRedisConfigured) {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const defaultJobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  };

  emailQueue = new Queue('email-queue', { connection, defaultJobOptions });
  calendarQueue = new Queue('calendar-queue', { connection, defaultJobOptions });
  
  console.log('BullMQ queues initialized with Redis connection and retry backoff.');
} else {
  emailQueue = new MockQueue('email-queue');
  calendarQueue = new MockQueue('calendar-queue');
  console.log('BullMQ queues initialized with local MockQueue fallback.');
}

export { emailQueue, calendarQueue, isRedisConfigured };
