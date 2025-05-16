import type { RedisOptions } from "ioredis";
import { Redis } from "ioredis";
import { logger } from "./logger.js";

/**
 * Redis client configuration for local development
 * @type {RedisOptions}
 * @description
 * Default configuration for connecting to a local Redis instance:
 * - Host: localhost
 * - Port: 6379
 * - Database: 0
 * - Max retries: 3
 * - Command timeout: 520s
 * - Connect timeout: 10s
 */
export const redisConfig = {
	host: "localhost",
	port: 6379,
	maxRetriesPerRequest: 3,
	enableReadyCheck: true,
	db: 0,
	commandTimeout: 520000,
	connectTimeout: 10000,
} satisfies RedisOptions;

/**
 * Initializes and returns a Redis client for local development
 * @async
 * @function initLocalClient
 * @description
 * Creates a Redis client with event listeners for:
 * - connecting: Logs when client is connecting
 * - ready: Logs when client is ready
 * - reconnecting: Logs when client is reconnecting
 * - error: Logs any client errors
 * - connect: Logs when client connects
 * - close: Logs when client closes
 * - end: Logs when client ends
 * Also sets up process event listeners for graceful shutdown
 * @returns {Promise<Redis>} A configured Redis client instance
 */
export async function initLocalClient() {
	const client = new Redis(redisConfig);
	client.on("connecting", () =>
		logger.info("Redis: Redis client connecting to localhost DB=0..."),
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
