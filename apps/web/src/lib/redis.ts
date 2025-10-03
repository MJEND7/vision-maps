import { createClient } from "redis";

if (!process.env.REDIS_REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

// Create Redis client for Vercel
const redisClient = createClient({
  url: process.env.REDIS_REDIS_URL,
});

// Connect to Redis
redisClient.on("error", (err) => console.error("Redis Client Error", err));

// Ensure connection is established
let isConnected = false;
const connectRedis = async () => {
  if (!isConnected) {
    await redisClient.connect();
    isConnected = true;
  }
};

// Helper wrapper to ensure connection before operations
export const redis = {
  async get<T = string>(key: string): Promise<T | null> {
    await connectRedis();
    const value = await redisClient.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  async set(key: string, value: string | object, options?: { ex?: number }): Promise<void> {
    await connectRedis();
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    if (options?.ex) {
      await redisClient.setEx(key, options.ex, stringValue);
    } else {
      await redisClient.set(key, stringValue);
    }
  },

  async del(key: string): Promise<void> {
    await connectRedis();
    await redisClient.del(key);
  },
};
