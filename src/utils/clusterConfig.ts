import { Cluster } from "ioredis";

import type { ClusterNode, ClusterOptions } from "ioredis";
import { logger } from "@/utils/logger.js";
import env from "@/utils/env.js";

/**
 * Redis cluster node configuration
 * @type {ClusterNode[]}
 * @description
 * Defines the primary node for the Redis cluster using environment variables
 */
export const CLUSTER_NODES = [
	{
		host: env.cluster.host,
		port: env.cluster.port,
	},
] as ClusterNode[];

/**
 * Redis cluster configuration options
 * @type {ClusterOptions}
 * @description
 * Configuration for Redis cluster connection:
 * - DNS lookup handling
 * - Redis options (TLS, password, timeouts)
 * - Slot refresh settings
 */
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

/**
 * Initializes and returns a Redis cluster client
 * @async
 * @function initClusterClient
 * @description
 * Creates a Redis cluster client with event listeners for:
 * - connecting: Logs when client is connecting
 * - ready: Logs when client is ready
 * - reconnecting: Logs when client is reconnecting
 * - error: Logs any client errors
 * - connect: Logs when client connects
 * - close: Logs when client closes
 * - end: Logs when client ends
 * Also sets up process event listeners for graceful shutdown
 * @returns {Promise<Cluster>} A configured Redis cluster client instance
 */
export async function initClusterClient() {
	const client = new Cluster(CLUSTER_NODES, CLUSTER_OPTIONS);
	client.on("connecting", () =>
		logger.info(
			`Redis Cluster: Redis client connecting to ${env.cluster.host}...`,
		),
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
