import { Cluster } from "ioredis";

import type { ClusterNode, ClusterOptions } from "ioredis";

export const CLUSTER_NODES = [
	{
		host: process.env.REDIS_CLUSTER_HOST,
		port: Number(process.env.REDIS_CLUSTER_PORT),
	},
] as ClusterNode[];

export const CLUSTER_OPTIONS = {
	dnsLookup: (address, callback) => callback(null, address),
	redisOptions: {
		commandTimeout: 60000,
		tls: {},
		enableAutoPipelining: true,
		password: process.env.REDIS_CLUSTER_PASSWORD,
		keepAlive: 15000,
	},
} as ClusterOptions;

export async function initClusterClient() {
	const client = new Cluster(CLUSTER_NODES, CLUSTER_OPTIONS);
	client.on("connecting", () =>
		console.log("Redis Cluster: Redis client connecting..."),
	);
	client.on("ready", () => console.log("Redis Cluster: Redis client ready!"));
	client.on("reconnecting", () =>
		console.log("Redis Cluster: Redis client reconnecting..."),
	);
	client.on("error", (error) =>
		console.log("Redis Cluster: Redis client error", error),
	);
	client.on("connect", () =>
		console.log("Redis Cluster: Redis client connected!"),
	);
	client.on("close", () => console.log("Redis Cluster: Redis client closed!"));
	client.on("end", () => console.log("Redis Cluster: Redis client ended."));

	process.on("SIGTERM", () => {
		console.log("Redis Cluster: Quitting as process exited");
		client.quit();
	});
	process.on("SIGINT", () => {
		console.log("Redis Cluster: Quitting as process exited");
		client.quit();
	});
	process.on("exit", () => {
		console.log("Redis Cluster: Quitting as process exited");
		client.quit();
	});

	return client;
}
