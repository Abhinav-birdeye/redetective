import type { Cluster, Redis } from "ioredis";

interface BaseBatchProcessOptions {
    cursor: number;
    updateCursor: (value: number) => void;
}

export interface ClusterBatchProcessOptions extends BaseBatchProcessOptions {
    clusterClient: Cluster;
    updateKeysDeleted: (value: number) => void;
}

export interface StandaloneBatchProcessOptions extends BaseBatchProcessOptions {
    standAloneClient: Redis;
    updateKeysDeleted: (value: number) => void;
}

export interface MigrateBatchProcessOptions extends BaseBatchProcessOptions {
    standAloneClient: Redis;
    clusterClient: Cluster;
    updateKeysMigrated: (value: number) => void;
}

export interface BroadcastEvent {
    data: {
        message: string;
        id: number;
    };
}