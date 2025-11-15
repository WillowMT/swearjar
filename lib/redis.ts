import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL,
        });

        redisClient.on('error', (err) => {
            console.error('Redis Client Error', err);
        });
    }

    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

    return redisClient;
}

export default getRedisClient;