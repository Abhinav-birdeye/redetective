import pino from "pino";

export const logger = pino.pino({
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
	redact: ["*.password", "*.REDIS_PASSWORD", "*.REDIS_CLUSTER_PASSWORD"], // Redact sensitive fields
});
