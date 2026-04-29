import { Redis, type RedisOptions } from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

export const redisOptions: RedisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
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


