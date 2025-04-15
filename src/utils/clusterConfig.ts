import { Cluster } from "ioredis";

import type { ClusterNode, ClusterOptions } from "ioredis";
import { logger } from "./logger.js";
import env from "./env.js";

export const CLUSTER_NODES = [
	{
		host: env.cluster.host,
		port: env.cluster.port,
	},
] as ClusterNode[];

export const CLUSTER_OPTIONS = {
	dnsLookup: (address, callback) => callback(null, address),
	redisOptions: {
		enableOfflineQueue: false,
		commandTimeout: 60000,
		tls: {},
		enableAutoPipelining: true,
		password: env.cluster.password,
		keepAlive: 15000,
	},
	slotsRefreshTimeout: 10000,
	slotsRefreshInterval: 10000,
} as ClusterOptions;

export async function initClusterClient() {
	const client = new Cluster(CLUSTER_NODES, CLUSTER_OPTIONS);
	client.on("connecting", () =>
		logger.info(`Redis Cluster: Redis client connecting to ${env.cluster.host}...`),
	);
	client.on("ready", () => logger.info("Redis Cluster: Redis client ready!"));
	client.on("reconnecting", () =>
		logger.info("Redis Cluster: Redis client reconnecting..."),
	);
	client.on("error", (error) =>
		logger.error(error, "Redis Cluster: Redis client error"),
	);
	client.on("connect", () =>
		logger.info("Redis Cluster: Redis client connected!"),
	);
	client.on("close", () => logger.info("Redis Cluster: Redis client closed!"));
	client.on("end", () => logger.info("Redis Cluster: Redis client ended."));

	process.on("SIGTERM", () => {
		logger.info("Redis Cluster: Quitting as process exited");
		client.quit();
	});
	process.on("SIGINT", () => {
		logger.info("Redis Cluster: Quitting as process exited");
		client.quit();
	});
	process.on("exit", () => {
		logger.info("Redis Cluster: Quitting as process exited");
		client.quit();
	});

	return client;
}
