import type { RedisOptions } from "ioredis";
import { Redis } from "ioredis";
import { logger } from "./logger.js";
import env from "./env.js";

export const redisConfig = {
	host: env.client.host,
	port: env.client.port,
	password: env.client.password,
	maxRetriesPerRequest: 1,
	enableReadyCheck: true,
	db: env.client.db,
	commandTimeout: 520000,
	connectTimeout: 10000,
} satisfies RedisOptions;

export async function initClient() {
	const client = new Redis(redisConfig);
	client.on("connecting", () =>
		logger.info(`Redis: Redis client connecting to HOST=${env.client.host} DB=${env.client.db}...`),
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
