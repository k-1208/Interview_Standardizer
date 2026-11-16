import { prisma } from './prismaClient.js';
import { pdfQueue } from '../service/queue/pdf.queue.js';

const CHECK_TIMEOUT_MS = 3000;

const withTimeout = <T>(promise: Promise<T>, label: string) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} check timed out`)), CHECK_TIMEOUT_MS)
    ),
  ]);

/** Pings Postgres and Redis. Used by GET /ready and the Docker healthcheck. */
export const checkReadiness = async () => {
  const [database, redis] = await Promise.allSettled([
    withTimeout(prisma.$queryRaw`SELECT 1`, 'database'),
    // A real Redis round-trip through the queue's own connection.
    withTimeout(pdfQueue.getJobCounts('waiting'), 'redis'),
  ]);

  const checks = {
    database: database.status === 'fulfilled' ? 'ok' : 'down',
    redis: redis.status === 'fulfilled' ? 'ok' : 'down',
  } as const;

  if (database.status === 'rejected') console.error('[readiness] database:', database.reason);
  if (redis.status === 'rejected') console.error('[readiness] redis:', redis.reason);

  return { ready: checks.database === 'ok' && checks.redis === 'ok', checks };
};
