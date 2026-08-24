/**
 * Standalone background worker process.
 *
 * Why this file exists: `src/lib/queue/client.ts` pushes jobs onto BullMQ
 * queues (email-queue, calendar-queue) whenever REDIS_URL is set. Those
 * jobs are only ever consumed by the `Worker` instances defined in
 * `src/lib/queue/workers.ts` — but nothing in the Next.js app itself ever
 * imports that module in a way that keeps running. Importing it from an API
 * route would start a Worker for the lifetime of that single request/
 * invocation, which is not what a BullMQ Worker needs — it needs a
 * long-lived process that stays connected to Redis and keeps polling.
 *
 * Run this as its own process, alongside `next start`, wherever the app is
 * deployed on infrastructure that supports long-running processes (a VM,
 * Render/Railway background worker service, a Docker container, etc.):
 *
 *   npm run worker
 *
 * NOTE ON SERVERLESS (e.g. Vercel): Vercel serverless/edge functions do not
 * support long-lived background processes — a function invocation ends
 * shortly after it returns a response, which would kill this worker
 * immediately. If deploying the web app to Vercel, run this worker as a
 * separate always-on service instead (e.g. a small Render/Railway/Fly.io
 * worker deployment, or a VM) pointed at the same REDIS_URL and DATABASE_URL.
 * See README.md "Background Workers" section for deployment notes.
 */

// Importing this module for its side effects starts the BullMQ Worker
// instances (see the `if (isRedisConfigured)` block at the bottom of
// workers.ts). If REDIS_URL isn't set, this import is a no-op — jobs will
// keep using the inline MockQueue fallback in that case, and this process
// can simply exit (see below).
import './lib/queue/workers';

const isRedisConfigured = !!process.env.REDIS_URL;

if (!isRedisConfigured) {
  console.log(
    '[worker] REDIS_URL is not set — there are no BullMQ queues to consume. ' +
      'Jobs are being processed inline via the MockQueue fallback instead. Exiting.'
  );
  process.exit(0);
}

console.log('[worker] Background worker process started. Listening for email-queue and calendar-queue jobs...');

// Keep the process alive. The Worker instances created inside
// `lib/queue/workers.ts` register their own listeners on the Redis
// connection, which is enough to keep Node's event loop alive on its own —
// this interval just gives us a periodic liveness log and a defensive
// keep-alive in case that ever changes.
setInterval(() => {
  console.log('[worker] heartbeat — still listening.');
}, 60_000);

function shutdown(signal: string) {
  console.log(`[worker] Received ${signal}, shutting down gracefully...`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
