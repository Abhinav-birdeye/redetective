import type { RedisOptions } from "ioredis";
import { Redis } from "ioredis";

export const redisConfig = {
	host: process.env.REDIS_HOST,
	port: Number(process.env.REDIS_PORT),
	password: process.env.REDIS_PASSWORD,
	maxRetriesPerRequest: 1,
	enableReadyCheck: true,
	db: Number(process.env.REDIS_DB),
	commandTimeout: 10000,
	connectTimeout: 10000,
} satisfies RedisOptions;

export async function initClient() {
	const client = new Redis(redisConfig);
	client.on("connecting", () =>
		console.log("Redis: Redis client connecting..."),
	);
	client.on("ready", () => console.log("Redis: Redis client ready!"));
	client.on("reconnecting", () =>
		console.log("Redis: Redis client reconnecting..."),
	);
	client.on("error", (error) =>
		console.log("Redis: Redis client error", error),
	);
	client.on("connect", () => console.log("Redis: Redis client connected!"));
	client.on("close", () => console.log("Redis: Redis client closed!"));
	client.on("end", () => console.log("Redis: Redis client ended."));

	process.on("SIGTERM", () => {
		console.log("Redis: Quitting as process exited");
		client.quit();
	});
	process.on("SIGINT", () => {
		console.log("Redis: Quitting as process exited");
		client.quit();
	});
	process.on("exit", () => {
		console.log("Redis: Quitting as process exited");
		client.quit();
	});

	return client;
}
