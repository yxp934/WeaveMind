import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const QUEUE_NAME = 'ai-course-generation'

export type AIGenerationJobData = {
  runId: string
}

let queue: Queue<AIGenerationJobData> | null = null

function getQueue(): Queue<AIGenerationJobData> | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  if (!queue) {
    const connection = new IORedis(redisUrl)
    queue = new Queue<AIGenerationJobData>(QUEUE_NAME, { connection })
  }
  return queue
}

/**
 * Enqueue an AI generation job. If Redis/queue is not configured, falls back to
 * running synchronously in-process (useful for local development).
 */
export async function enqueueAIGenerationJob(data: AIGenerationJobData) {
  const q = getQueue()
  if (!q) {
    // Fallback: run synchronously without queue
    const { runCourseGeneration } = await import('@/lib/ai/course-generation-orchestrator')
    await runCourseGeneration(data.runId)
    return
  }

  await q.add('generate', data, {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  })
}

export function getQueueName() {
  return QUEUE_NAME
}

