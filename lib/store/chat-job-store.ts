// 内存存储任务状态（生产环境应使用Redis或数据库）
export interface ChatJobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: {
    message: string
    metadata?: {
      sessionId?: string
      toolsUsed?: string[]
    }
  }
  error?: string
  createdAt: Date
  updatedAt: Date
}

class ChatJobStore {
  private jobs = new Map<string, ChatJobStatus>()

  create(jobId: string): ChatJobStatus {
    const job: ChatJobStatus = {
      jobId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.jobs.set(jobId, job)
    return job
  }

  update(jobId: string, updates: Partial<ChatJobStatus>) {
    const job = this.jobs.get(jobId)
    if (job) {
      const updated = {
        ...job,
        ...updates,
        updatedAt: new Date(),
      }
      this.jobs.set(jobId, updated)
    }
  }

  get(jobId: string): ChatJobStatus | undefined {
    return this.jobs.get(jobId)
  }

  // 清理旧任务（超过1小时）
  cleanup() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.updatedAt < oneHourAgo) {
        this.jobs.delete(jobId)
      }
    }
  }
}

export const chatJobStore = new ChatJobStore()

// 每小时清理一次旧任务
setInterval(() => {
  chatJobStore.cleanup()
}, 60 * 60 * 1000)
