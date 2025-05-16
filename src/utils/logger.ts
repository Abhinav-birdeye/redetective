import pino from "pino";

/**
 * Configured Pino logger instance with pretty printing and sensitive data redaction
 * @type {pino.Logger}
 * @description
 * Features:
 * - Pretty printing with colorization
 * - Automatic redaction of sensitive fields (passwords)
 * - JSON-based logging
 */
export const logger = pino.pino({
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
	redact: ["*.password", "*.REDIS_PASSWORD", "*.REDIS_CLUSTER_PASSWORD"], // Redact sensitive fields
});
