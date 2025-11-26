import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { getQueueName } from '@/lib/queue/ai-generation-queue'
import { runCourseGeneration } from '@/lib/ai/course-generation-orchestrator'

async function main() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.error('REDIS_URL is not set. AI generation worker cannot start.')
    process.exit(1)
  }

  const connection = new IORedis(redisUrl)

  const worker = new Worker(
    getQueueName(),
    async (job) => {
      const { runId } = job.data as { runId: string }
      await runCourseGeneration(runId)
    },
    { connection }
  )

  worker.on('completed', (job) => {
    console.log('AI generation job completed', job.id, job.data)
  })

  worker.on('failed', (job, err) => {
    console.error('AI generation job failed', job?.id, job?.data, err)
  })

  console.log('AI generation worker started, listening on queue:', getQueueName())
}

main().catch((err) => {
  console.error('AI generation worker failed to start', err)
  process.exit(1)
})

