// API客户端 - 集成31个后端API端点
import { createClient } from '@supabase/supabase-js'

// 直接创建并导出supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://odowwkdgduhecrmuatnx.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kb3d3a2RnZHVoZWNybXVhdG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMjY2NjksImV4cCI6MjA3OTYwMjY2OX0.u2VyB6JqOz1mcbcW9gpo1GISaBRXzxqBkrWRg8LsCvA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 讨论系统API (10个端点)
export const discussionsAPI = {
  // 获取讨论线程列表
  async listThreads(classId?: string) {
    let query = supabase
      .from('discussion_threads')
      .select('*, author:users(id, name, avatar_url), posts:discussion_posts(count)')
      .order('created_at', { ascending: false })

    if (classId) {
      query = query.eq('class_id', classId)
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
    const { data, error } = await supabase
      .from('discussion_threads')
      .insert([threadData])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 获取讨论帖子
  async listPosts(threadId: string) {
    const { data, error } = await supabase
      .from('discussion_posts')
      .select('*, author:users(id, name, avatar_url)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  // 创建帖子
  async createPost(postData: {
    thread_id: string
    content: string
    parent_id?: string
  }) {
    const { data, error } = await supabase
      .from('discussion_posts')
      .insert([postData])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 更新帖子
  async updatePost(postId: string, content: string) {
    const { data, error } = await supabase
      .from('discussion_posts')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 删除帖子
  async deletePost(postId: string) {
    const { error } = await supabase
      .from('discussion_posts')
      .delete()
      .eq('id', postId)
    if (error) throw error
  },

  // 获取线程详情
  async getThread(threadId: string) {
    const { data, error } = await supabase
      .from('discussion_threads')
      .select('*, author:users(id, name, avatar_url)')
      .eq('id', threadId)
      .single()
    if (error) throw error
    return data
  },

  // 更新线程
  async updateThread(threadId: string, updates: any) {
    const { data, error } = await supabase
      .from('discussion_threads')
      .update(updates)
      .eq('id', threadId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 删除线程
  async deleteThread(threadId: string) {
    const { error } = await supabase
      .from('discussion_threads')
      .delete()
      .eq('id', threadId)
    if (error) throw error
  },

  // 获取参与者
  async getParticipants(threadId: string) {
    const { data, error } = await supabase
      .from('discussion_participants')
      .select('*, user:users(id, name, avatar_url)')
      .eq('thread_id', threadId)
    if (error) throw error
    return data
  }
}

// 通知系统API (8个端点)
export const notificationsAPI = {
  // 获取通知列表
  async listNotifications(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  // 创建通知
  async createNotification(notificationData: {
    user_id: string
    type: string
    title: string
    content: string
    metadata?: any
  }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 标记已读
  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 批量标记已读
  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) throw error
    return data
  },

  // 获取通知偏好
  async getPreferences(userId: string) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return data
  },

  // 更新通知偏好
  async updatePreferences(userId: string, preferences: any) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...preferences })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 发送通知（教师功能）
  async sendNotification(notificationData: {
    recipient_ids: string[]
    type: string
    title: string
    content: string
    metadata?: any
  }) {
    // 批量插入通知
    const notifications = notificationData.recipient_ids.map(userId => ({
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      content: notificationData.content,
      metadata: notificationData.metadata
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()
    if (error) throw error
    return data
  },

  // 获取通知统计
  async getSummary(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('is_read')
      .eq('user_id', userId)
    if (error) throw error

    const total = data?.length || 0
    const unread = data?.filter(n => !n.is_read).length || 0

    return { total, unread }
  }
}

// 设置管理API (4个端点)
export const settingsAPI = {
  // 获取用户设置
  async getSettings(userId: string, scope = 'user') {
    let query = supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('scope', scope)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // 更新设置
  async updateSetting(userId: string, settingData: {
    setting_category: string
    setting_key: string
    setting_value: any
    data_type?: string
  }) {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        scope: 'user',
        data_type: settingData.data_type || 'json',
        ...settingData
      }, {
        onConflict: 'user_id,scope,setting_category,setting_key'
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 删除设置
  async deleteSetting(userId: string, settingKey: string) {
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId)
      .eq('setting_key', settingKey)
    if (error) throw error
  },

  // 获取引导进度
  async getOnboardingProgress(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return data
  }
}

// 自学习者API (6个端点)
export const selfLearnerAPI = {
  // 获取学习路径
  async listPathways(userId?: string, isPublic = true) {
    let query = supabase
      .from('self_learner_pathways')
      .select('*, creator:users(id, name, avatar_url)')
      .eq('is_public', isPublic)

    if (userId) {
      query = query.or(`created_by.eq.${userId},user_id.eq.${userId}`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // 创建学习路径
  async createPathway(pathwayData: {
    title: string
    description: string
    difficulty_level: string
    estimated_duration: number
    is_public?: boolean
    tags?: string[]
  }) {
    const { data, error } = await supabase
      .from('self_learner_pathways')
      .insert([pathwayData])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 获取收藏列表
  async listFavorites(userId: string) {
    const { data, error } = await supabase
      .from('self_learner_favorites')
      .select('*, course:courses(*), class:classes(*), chapter:chapters(*), component:components(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // 添加收藏
  async addFavorite(favoriteData: {
    user_id: string
    favorite_type: string
    course_id?: string
    class_id?: string
    chapter_id?: string
    component_id?: string
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('self_learner_favorites')
      .insert([favoriteData])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 移除收藏
  async removeFavorite(favoriteId: string) {
    const { error } = await supabase
      .from('self_learner_favorites')
      .delete()
      .eq('id', favoriteId)
    if (error) throw error
  },

  // 获取活动记录
  async getActivities(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('self_learner_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }
}

// AI聊天API (3个端点)
export const aiAPI = {
  // 统一AI对话
  async chat(message: string, context: any) {
    const response = await fetch('/api/trigger/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context })
    })
    if (!response.ok) throw new Error('AI chat failed')
    return response.json()
  },

  // 讨论管理助手
  async discussionAssistant(action: string, data: any) {
    const response = await fetch('/api/ai/discussion-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    })
    if (!response.ok) throw new Error('Discussion assistant failed')
    return response.json()
  },

  // 设置优化顾问
  async settingsAdvisor(action: string, data: any) {
    const response = await fetch('/api/ai/settings-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    })
    if (!response.ok) throw new Error('Settings advisor failed')
    return response.json()
  }
}

// 统一的API客户端导出
export const apiClient = {
  discussions: discussionsAPI,
  notifications: notificationsAPI,
  settings: settingsAPI,
  selfLearner: selfLearnerAPI,
  ai: aiAPI
}

export default apiClient
