import { Redis, type RedisOptions } from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_USERNAME = process.env.REDIS_USERNAME || undefined;
const REDIS_TLS = process.env.REDIS_TLS === 'true';

if (process.env.NODE_ENV === 'production' && !REDIS_PASSWORD) {
  console.warn('[redis] REDIS_PASSWORD is not set; Redis connections are unauthenticated');
}

export const redisOptions: RedisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  ...(REDIS_USERNAME ? { username: REDIS_USERNAME } : {}),
  ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
  ...(REDIS_TLS ? { tls: {} } : {}),
  maxRetriesPerRequest: null, // required for BullMQ
  enableReadyCheck: false, // recommended for BullMQ
  keepAlive: 10000,
};

export const connection = new Redis(redisOptions);

connection.on("connect", () => {
  console.log("✅ Redis connected");
});

connection.on("error", (err) => {
  console.error("❌ Redis error:", err);
});


