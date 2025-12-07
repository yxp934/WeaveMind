// API客户端 - 集成31个后端API端点
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// API客户端类
class APIClient {
  private supabase: typeof supabase

  constructor(supabaseClient: typeof supabase) {
    this.supabase = supabaseClient
  }

  // 讨论系统API (10个端点)
  discussions = {
    // 获取讨论线程列表
    async listThreads(classId?: string) {
      const query = this.supabase
        .from('discussion_threads')
        .select('*, author:users(id, name, avatar_url), posts:discussion_posts(count)')
        .order('created_at', { ascending: false })

      if (classId) {
        query.eq('class_id', classId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // 创建讨论线程
    async createThread(threadData: {
      title: string
      description: string
      class_id: string
      course_id?: string
      category?: string
    }) {
      const { data, error } = await this.supabase
        .from('discussion_threads')
        .insert([threadData])
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 获取讨论帖子
    async listPosts(threadId: string) {
      const { data, error } = await this.supabase
        .from('discussion_posts')
        .select('*, author:users(id, name, avatar_url)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },

    // 创建讨论帖子
    async createPost(postData: {
      thread_id: string
      content: string
      parent_id?: string
    }) {
      const { data, error } = await this.supabase
        .from('discussion_posts')
        .insert([postData])
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 更新讨论帖子
    async updatePost(postId: string, updates: { content: string }) {
      const { data, error } = await this.supabase
        .from('discussion_posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 删除讨论帖子
    async deletePost(postId: string) {
      const { error } = await this.supabase
        .from('discussion_posts')
        .delete()
        .eq('id', postId)
      if (error) throw error
    },

    // 获取讨论统计
    async getStats(threadId?: string) {
      let query = this.supabase
        .from('discussion_threads')
        .select('id, posts:discussion_posts(count)')

      if (threadId) {
        query = query.eq('id', threadId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // 搜索讨论
    async searchThreads(searchTerm: string, classId?: string) {
      let query = this.supabase
        .from('discussion_threads')
        .select('*, author:users(id, name, avatar_url)')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      if (classId) {
        query = query.eq('class_id', classId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // 获取热门讨论
    async getPopularThreads(classId?: string, limit = 10) {
      let query = this.supabase
        .from('discussion_threads')
        .select('*, author:users(id, name, avatar_url), posts:discussion_posts(count)')
        .order('posts_count', { ascending: false })
        .limit(limit)

      if (classId) {
        query = query.eq('class_id', classId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // 获取用户参与度
    async getUserEngagement(userId: string) {
      const { data, error } = await this.supabase
        .from('discussion_posts')
        .select('thread_id, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  }

  // 通知系统API (8个端点)
  notifications = {
    // 获取通知列表
    async list(userId?: string, limit = 50) {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // 创建通知
    async create(notificationData: {
      user_id: string
      title: string
      content: string
      type: 'info' | 'success' | 'warning' | 'error'
      category: string
      action_url?: string
    }) {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 标记通知为已读
    async markAsRead(notificationId: string) {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 批量标记为已读
    async markAllAsRead(userId: string) {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
        .select()
      if (error) throw error
      return data
    },

    // 获取未读通知数量
    async getUnreadCount(userId: string) {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)
      if (error) throw error
      return count || 0
    },

    // 删除通知
    async delete(notificationId: string) {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
      if (error) throw error
    },

    // 获取通知设置
    async getSettings(userId: string) {
      const { data, error } = await this.supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data
    },

    // 更新通知设置
    async updateSettings(userId: string, settings: {
      email_notifications?: boolean
      push_notifications?: boolean
      discussion_notifications?: boolean
      assignment_notifications?: boolean
      grade_notifications?: boolean
    }) {
      const { data, error } = await this.supabase
        .from('notification_settings')
        .upsert({ user_id: userId, ...settings })
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  // 设置管理API (4个端点)
  settings = {
    // 获取用户设置
    async get(userId: string) {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data
    },

    // 更新用户设置
    async update(userId: string, settings: {
      theme?: 'light' | 'dark' | 'auto'
      language?: string
      timezone?: string
      email_frequency?: 'immediate' | 'daily' | 'weekly' | 'never'
      ai_assistance_enabled?: boolean
      auto_save_enabled?: boolean
    }) {
      const { data, error } = await this.supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...settings })
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 获取组织设置
    async getOrganization(organizationId: string) {
      const { data, error } = await this.supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single()
      if (error) throw error
      return data
    },

    // 更新组织设置
    async updateOrganization(organizationId: string, settings: {
      name?: string
      description?: string
      website?: string
      ai_optimization_enabled?: boolean
      auto_grading_enabled?: boolean
      discussion_moderation_enabled?: boolean
    }) {
      const { data, error } = await this.supabase
        .from('organization_settings')
        .upsert({ organization_id: organizationId, ...settings })
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  // 自学习者API (6个端点)
  selfLearner = {
    // 获取学习路径
    async getPathways(userId: string) {
      const { data, error } = await this.supabase
        .from('learning_pathways')
        .select('*, progress:learning_progress(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },

    // 创建学习路径
    async createPathway(pathwayData: {
      user_id: string
      title: string
      description: string
      goals: string[]
      difficulty_level: 'beginner' | 'intermediate' | 'advanced'
      estimated_duration: number // 天数
    }) {
      const { data, error } = await this.supabase
        .from('learning_pathways')
        .insert([pathwayData])
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 获取个性化推荐
    async getRecommendations(userId: string, limit = 10) {
      const { data, error } = await this.supabase
        .from('learning_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('viewed', false)
        .order('score', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },

    // 标记推荐为已查看
    async markRecommendationViewed(recommendationId: string) {
      const { data, error } = await this.supabase
        .from('learning_recommendations')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', recommendationId)
        .select()
        .single()
      if (error) throw error
      return data
    },

    // 获取学习进度
    async getProgress(userId: string, pathwayId?: string) {
      let query = this.supabase
        .from('learning_progress')
        .select('*, pathway:learning_pathways(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (pathwayId) {
        query = query.eq('pathway_id', pathwayId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // 更新学习进度
    async updateProgress(progressData: {
      user_id: string
      pathway_id: string
      milestone_id?: string
      completed: boolean
      time_spent?: number // 分钟
      notes?: string
    }) {
      const { data, error } = await this.supabase
        .from('learning_progress')
        .upsert(progressData)
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  // AI工具调用
  async callAITool(toolName: string, params: any) {
    const { data, error } = await this.supabase.functions.invoke('ai-tool-executor', {
      body: {
        tool: toolName,
        params
      }
    })
    if (error) throw error
    return data
  }

  // 实时数据订阅
  subscribe(table: string, callback: (payload: any) => void, filter?: string) {
    let subscription = this.supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter
      }, callback)
      .subscribe()

    return subscription
  }
}

export const apiClient = new APIClient(supabase)
export default apiClient