import type { RedisOptions } from "ioredis";
import { Redis } from "ioredis";
import { logger } from "./logger.js";

export const redisConfig = {
	host: process.env.REDIS_HOST,
	port: Number(process.env.REDIS_PORT),
	password: process.env.REDIS_PASSWORD,
	maxRetriesPerRequest: 1,
	enableReadyCheck: true,
	db: Number(process.env.REDIS_DB),
	commandTimeout: 60000,
	connectTimeout: 10000,
} satisfies RedisOptions;

export async function initClient() {
	const client = new Redis(redisConfig);
	client.on("connecting", () =>
		logger.info(`Redis: Redis client connecting to ${process.env.REDIS_HOST}...`),
	);
	client.on("ready", () => logger.info("Redis: Redis client ready!"));
	client.on("reconnecting", () =>
		logger.info("Redis: Redis client reconnecting..."),
	);
	client.on("error", (error) =>
		logger.error(error, "Redis: Redis client error"),
	);
	client.on("connect", () => logger.info("Redis: Redis client connected!"));
	client.on("close", () => logger.info("Redis: Redis client closed!"));
	client.on("end", () => logger.info("Redis: Redis client ended."));

	process.on("SIGTERM", () => {
		logger.info("Redis: Quitting as process exited");
		client.quit();
	});
	process.on("SIGINT", () => {
		logger.info("Redis: Quitting as process exited");
		client.quit();
	});
	process.on("exit", () => {
		logger.info("Redis: Quitting as process exited");
		client.quit();
	});

	return client;
}
