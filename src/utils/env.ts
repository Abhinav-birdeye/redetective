import { z } from "zod";
import { logger } from "./logger.js";


const envSchema = z.object({
    REDIS_HOST: z.string(),
    REDIS_PASSWORD: z.string(),
    REDIS_DB: z.string().transform((arg) => Number(arg)),
    REDIS_PORT: z.string().transform((arg) => Number(arg)),
    REDIS_CLUSTER_HOST: z.string(),
    REDIS_CLUSTER_PASSWORD: z.string(),
    REDIS_CLUSTER_PORT: z.string().transform((arg) => Number(arg))
});

const env = (() => {
    try {
        logger.info({}, "Parsing environment variables");
        const env = envSchema.parse(process.env);
        const parsedEnv = {
            client: {
                host: env.REDIS_HOST,
                password: env.REDIS_PASSWORD,
                db: env.REDIS_DB,
                port: env.REDIS_PORT
            },
            cluster: {
                host: env.REDIS_CLUSTER_HOST,
                password: env.REDIS_CLUSTER_PASSWORD,
                port: env.REDIS_CLUSTER_PORT
            }
        } as const;
        return parsedEnv;
    } catch (error) {
        logger.error(error, "Error parsing environment variables, re-check if all the variables have been added")
        process.exit(0);
    }
})();

export default env;
