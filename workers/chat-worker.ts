import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { getChatQueueName, ChatJobData } from '@/lib/queue/chat-queue'
import { processChatJob } from '@/lib/workers/chat-processor'

async function main() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.error('REDIS_URL is not set. Chat worker cannot start.')
    process.exit(1)
  }

  const connection = new IORedis(redisUrl)

  const worker = new Worker(
    getChatQueueName(),
    async (job) => {
      const data = job.data as ChatJobData
      return await processChatJob(data)
    },
    { connection }
  )

  worker.on('completed', (job, result) => {
    console.log('Chat job completed', job.id, {
      jobId: job.data.jobId,
      success: result.success,
      messageLength: result.message?.length || 0
    })
  })

  worker.on('failed', (job, err) => {
    console.error('Chat job failed', job?.id, job?.data, err)
  })

  console.log('Chat worker started, listening on queue:', getChatQueueName())
}

main().catch((err) => {
  console.error('Chat worker failed to start', err)
  process.exit(1)
})
