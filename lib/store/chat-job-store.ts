import IORedis from "ioredis";

// 任务状态类型
export interface ChatJobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: {
    message: string;
    metadata?: {
      sessionId?: string;
      toolsUsed?: string[];
    };
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const REDIS_JOB_PREFIX = "chat-job:";

let redisClient: IORedis | null = null;

function getRedisClient(): IORedis | null {
  const url = process.env.REDIS_URL;
  if (!url || url === "database_provisioning_in_progress") return null;
  if (!redisClient) {
    redisClient = new IORedis(url);
  }
  return redisClient;
}

class ChatJobStore {
  private jobs = new Map<string, ChatJobStatus>();

  create(jobId: string): ChatJobStatus {
    const job: ChatJobStatus = {
      jobId,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);

    const client = getRedisClient();
    if (client) {
      // 写入Redis（异步执行，不阻塞主流程）
      client
        .set(
          `${REDIS_JOB_PREFIX}${jobId}`,
          JSON.stringify(job),
          "EX",
          60 * 60, // 1小时过期
        )
        .catch((err) => {
          console.error("[ChatJobStore] Failed to write job to Redis:", err);
        });
    }

    return job;
  }

  update(jobId: string, updates: Partial<ChatJobStatus>) {
    const job = this.jobs.get(jobId);
    if (job) {
      const updated = {
        ...job,
        ...updates,
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, updated);

      const client = getRedisClient();
      if (client) {
        client
          .set(
            `${REDIS_JOB_PREFIX}${jobId}`,
            JSON.stringify(updated),
            "EX",
            60 * 60,
          )
          .catch((err) => {
            console.error("[ChatJobStore] Failed to update job in Redis:", err);
          });
      }
    }
  }

  async get(jobId: string): Promise<ChatJobStatus | undefined> {
    const client = getRedisClient();
    if (client) {
      try {
        const value = await client.get(`${REDIS_JOB_PREFIX}${jobId}`);
        if (value) {
          const parsed = JSON.parse(value) as ChatJobStatus;
          return parsed;
        }
      } catch (err) {
        console.error("[ChatJobStore] Failed to read job from Redis:", err);
      }
    }

    return this.jobs.get(jobId);
  }

  // 清理旧任务（超过1小时）
  cleanup() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.updatedAt < oneHourAgo) {
        this.jobs.delete(jobId);
      }
    }
  }
}

export const chatJobStore = new ChatJobStore();

// 每小时清理一次旧任务
setInterval(
  () => {
    chatJobStore.cleanup();
  },
  60 * 60 * 1000,
);
