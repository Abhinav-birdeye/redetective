import { z } from "zod";
import { logger } from "./logger.js";

/**
 * Schema for validating environment variables
 * @type {z.ZodObject}
 */
const envSchema = z.object({
	REDIS_HOST: z.string(),
	REDIS_PASSWORD: z.string(),
	REDIS_DB: z.string().transform((arg) => Number(arg)),
	REDIS_PORT: z.string().transform((arg) => Number(arg)),
	REDIS_CLUSTER_HOST: z.string(),
	REDIS_CLUSTER_PASSWORD: z.string(),
	REDIS_CLUSTER_PORT: z.string().transform((arg) => Number(arg)),
});

/**
 * Parses and validates environment variables for Redis configuration
 * @returns {Object} An object containing Redis client and cluster configurations
 * @property {Object} client - Redis client configuration
 * @property {string} client.host - Redis host
 * @property {string} client.password - Redis password
 * @property {number} client.db - Redis database number
 * @property {number} client.port - Redis port
 * @property {Object} cluster - Redis cluster configuration
 * @property {string} cluster.host - Redis cluster host
 * @property {string} cluster.password - Redis cluster password
 * @property {number} cluster.port - Redis cluster port
 * @throws {Error} If environment variables are missing or invalid
 */
const env = (() => {
	try {
		logger.info({}, "Parsing environment variables");
		const env = envSchema.parse(process.env);
		const parsedEnv = {
			client: {
				host: env.REDIS_HOST,
				password: env.REDIS_PASSWORD,
				db: env.REDIS_DB,
				port: env.REDIS_PORT,
			},
			cluster: {
				host: env.REDIS_CLUSTER_HOST,
				password: env.REDIS_CLUSTER_PASSWORD,
				port: env.REDIS_CLUSTER_PORT,
			},
		} as const;
		return parsedEnv;
	} catch (error) {
		logger.error(
			error,
			"Error parsing environment variables, re-check if all the variables have been added",
		);
		process.exit(0);
	}
})();

export default env;
