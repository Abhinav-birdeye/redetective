import type { RedisOptions } from "ioredis";
import { Redis } from "ioredis";
import { logger } from "./logger.js";
import env from "./env.js";

/**
 * Redis client configuration options
 * @type {RedisOptions}
 */
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

/**
 * Initializes and returns a Redis client with configured event listeners
 * @returns {Promise<Redis>} A configured Redis client instance
 * @description
 * Sets up event listeners for:
 * - connecting: Logs when client is connecting
 * - ready: Logs when client is ready
 * - reconnecting: Logs when client is reconnecting
 * - error: Logs any client errors
 * - connect: Logs when client connects
 * - close: Logs when client closes
 * - end: Logs when client ends
 * Also sets up process event listeners for graceful shutdown
 */
export async function initClient() {
	const client = new Redis(redisConfig);
	client.on("connecting", () =>
		logger.info(
			`Redis: Redis client connecting to HOST=${env.client.host} DB=${env.client.db}...`,
		),
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
