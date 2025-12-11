import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const QUEUE_NAME = 'ai-chat'

export type ChatJobData = {
  jobId: string
  message: string
  context: {
    courseId?: string
    classId?: string
    organizationId?: string
    userRole: 'teacher' | 'student' | 'self-learner'
    conversationHistory: Array<{
      role: string
      content: string
      timestamp: string
    }>
  }
}

let queue: Queue<ChatJobData> | null = null

function getQueue(): Queue<ChatJobData> | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  if (!queue) {
    const connection = new IORedis(redisUrl)
    queue = new Queue<ChatJobData>(QUEUE_NAME, { connection })
  }
  return queue
}

/**
 * Enqueue a chat job. If Redis/queue is not configured, falls back to
 * running synchronously in-process (useful for local development).
 */
export async function enqueueChatJob(data: ChatJobData) {
  const q = getQueue()
  if (!q) {
    // Fallback: run synchronously without queue
    const { processChatJob } = await import('@/lib/workers/chat-processor')
    await processChatJob(data)
    return
  }

  await q.add('chat', data, {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  })
}

export function getChatQueueName() {
  return QUEUE_NAME
}
