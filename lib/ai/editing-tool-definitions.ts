/**
 * Phase 5: AI Tool Definitions for Course Editing
 * 
 * Defines the tools that AI can call to edit courses using OpenAI-style tool calling
 */

import { tool } from 'ai'
import { z } from 'zod'
import {
  insertComponent,
  moveComponent,
  deleteComponent,
  updateComponentContent,
  addExamplesToConcept,
} from './course-editing-tools'

/**
 * Tool: Insert a new component into a chapter
 */
export const insertComponentTool = tool({
  description: 'Insert a new component (text, image, video, question, or interactive) into a chapter at a specific position',
  inputSchema: z.object({
    chapterId: z.string().describe('The ID of the chapter to insert the component into'),
    type: z.enum(['text', 'image', 'video', 'question', 'interactive']).describe('The type of component to insert'),
    content: z.any().describe('The content of the component as a JSON object'),
    position: z.number().optional().describe('The position to insert at (0-based index). If not specified, appends to end'),
  }),
  execute: async ({ chapterId, type, content, position }) => {
    return await insertComponent({ chapterId, type, content, position })
  },
})

/**
 * Tool: Move a component to a different position or chapter
 */
export const moveComponentTool = tool({
  description: 'Move a component to a different position within the same chapter or to another chapter',
  inputSchema: z.object({
    componentId: z.string().describe('The ID of the component to move'),
    targetChapterId: z.string().optional().describe('The ID of the target chapter. If not specified, moves within the same chapter'),
    targetPosition: z.number().describe('The target position (0-based index)'),
  }),
  execute: async ({ componentId, targetChapterId, targetPosition }) => {
    return await moveComponent({ componentId, targetChapterId, targetPosition })
  },
})

/**
 * Tool: Delete a component
 */
export const deleteComponentTool = tool({
  description: 'Delete a component from a chapter',
  inputSchema: z.object({
    componentId: z.string().describe('The ID of the component to delete'),
  }),
  execute: async ({ componentId }) => {
    return await deleteComponent({ componentId })
  },
})

/**
 * Tool: Update component content
 */
export const updateComponentContentTool = tool({
  description: 'Update the content of an existing component. Can merge with existing content or replace it entirely',
  inputSchema: z.object({
    componentId: z.string().describe('The ID of the component to update'),
    content: z.any().describe('The new content as a JSON object'),
    merge: z.boolean().optional().describe('If true, merge with existing content; if false, replace entirely. Default is false'),
  }),
  execute: async ({ componentId, content, merge }) => {
    return await updateComponentContent({ componentId, content, merge })
  },
})

/**
 * Tool: Add examples to all components mentioning a concept
 */
export const addExamplesToConceptTool = tool({
  description: 'Add concrete examples to all text components across all chapters that mention a specific concept or keyword',
  inputSchema: z.object({
    courseId: z.string().describe('The ID of the course'),
    conceptKeyword: z.string().describe('The concept or keyword to search for in component text'),
    examples: z.array(z.string()).describe('Array of example strings to add'),
  }),
  execute: async ({ courseId, conceptKeyword, examples }) => {
    return await addExamplesToConcept({ courseId, conceptKeyword, examples })
  },
})

/**
 * Tool: Get course structure for context
 */
export const getCourseStructureTool = tool({
  description: 'Get the complete structure of a course including all chapters and components for context',
  inputSchema: z.object({
    courseId: z.string().describe('The ID of the course'),
  }),
  execute: async ({ courseId }) => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data: course } = await supabase
      .from('courses')
      .select('id, title, description')
      .eq('id', courseId)
      .single()

    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title, description, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    const chaptersWithComponents = await Promise.all(
      (chapters || []).map(async (chapter) => {
        const { data: components } = await supabase
          .from('components')
          .select('id, type, content, order_index')
          .eq('chapter_id', chapter.id)
          .order('order_index', { ascending: true })

        return {
          ...chapter,
          components: components || [],
        }
      })
    )

    return {
      success: true,
      message: 'Course structure retrieved',
      data: {
        course,
        chapters: chaptersWithComponents,
      },
    }
  },
})

// ==================== 新增讨论管理工具 ====================

/**
 * Tool: Get discussion thread information
 */
export const getDiscussionThreadTool = tool({
  description: 'Get detailed information about a discussion thread including posts and participants',
  inputSchema: z.object({
    threadId: z.string().describe('The ID of the discussion thread'),
  }),
  execute: async ({ threadId }) => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data: thread } = await supabase
      .from('discussion_threads')
      .select(`
        *,
        courses(title),
        assignments(title)
      `)
      .eq('id', threadId)
      .single()

    const { data: posts } = await supabase
      .from('discussion_posts')
      .select(`
        *,
        users(email, raw_user_meta_data)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    const { data: participants } = await supabase
      .from('discussion_participants')
      .select(`
        *,
        users(email, raw_user_meta_data)
      `)
      .eq('thread_id', threadId)

    return {
      success: true,
      message: 'Discussion thread information retrieved',
      data: {
        thread,
        posts: posts || [],
        participants: participants || [],
      },
    }
  },
})

/**
 * Tool: Create a new discussion thread
 */
export const createDiscussionThreadTool = tool({
  description: 'Create a new discussion thread with AI-generated topic suggestions',
  inputSchema: z.object({
    classId: z.string().describe('The ID of the class'),
    courseId: z.string().optional().describe('The ID of the course (if course-specific)'),
    title: z.string().describe('The title of the discussion thread'),
    description: z.string().optional().describe('The description of the discussion thread'),
    type: z.enum(['general', 'course', 'assignment', 'announcement']).default('general'),
  }),
  execute: async ({ classId, courseId, title, description, type }) => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get class information for organization_id
    const { data: classData } = await supabase
      .from('classes')
      .select('organization_id')
      .eq('id', classId)
      .single()

    if (!classData) {
      throw new Error('Class not found')
    }

    const { data: thread, error } = await supabase
      .from('discussion_threads')
      .insert({
        class_id: classId,
        course_id: courseId,
        organization_id: classData.organization_id,
        title,
        description: description || '',
        type,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Discussion thread created successfully',
      data: thread,
    }
  },
})

/**
 * Tool: Get user settings and preferences
 */
export const getUserSettingsTool = tool({
  description: 'Get user settings and preferences for personalization',
  inputSchema: z.object({
    userId: z.string().describe('The ID of the user'),
    category: z.string().optional().describe('The category of settings to retrieve'),
  }),
  execute: async ({ userId, category }) => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    let query = supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (category) {
      query = query.eq('setting_category', category)
    }

    const { data: settings } = await query.order('setting_category').order('setting_key')

    return {
      success: true,
      message: 'User settings retrieved',
      data: settings || [],
    }
  },
})

/**
 * Tool: Update user settings
 */
export const updateUserSettingsTool = tool({
  description: 'Update user settings and preferences',
  inputSchema: z.object({
    userId: z.string().describe('The ID of the user'),
    settings: z.array(z.object({
      setting_category: z.string(),
      setting_key: z.string(),
      setting_value: z.any(),
      description: z.string().optional(),
    })),
  }),
  execute: async ({ userId, settings }) => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const updates = settings.map(setting => ({
      user_id: userId,
      ...setting,
      updated_at: new Date().toISOString(),
    }))

    const { data: updatedSettings, error } = await supabase
      .from('user_settings')
      .upsert(updates, {
        onConflict: 'user_id,setting_category,setting_key',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'User settings updated successfully',
      data: updatedSettings,
    }
  },
})

/**
 * Tool: Get self-learner pathway information
 */
export const getSelfLearnerPathwayTool = tool({
  description: 'Get self-learner pathway information including activities and progress',
  inputSchema: z.object({
    userId: z.string().describe('The ID of the user'),
    pathwayId: z.string().optional().describe('The ID of the specific pathway'),
  }),
  execute: async ({ userId, pathwayId }) => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    let query = supabase
      .from('self_learner_pathways')
      .select(`
        *,
        self_learner_activities(*)
      `)
      .eq('user_id', userId)

    if (pathwayId) {
      query = query.eq('id', pathwayId)
    }

    const { data: pathways } = await query.order('created_at', { ascending: false })

    return {
      success: true,
      message: 'Self-learner pathway information retrieved',
      data: pathways || [],
    }
  },
})

// ==================== 导入新的AI工具模块 ====================
import {
  discussionManagementTools,
  settingsOptimizationTools,
  learningPathTools,
  personalizationTools,
} from './tools'

/**
 * All editing tools combined
 */
export const courseEditingTools = {
  insertComponent: insertComponentTool,
  moveComponent: moveComponentTool,
  deleteComponent: deleteComponentTool,
  updateComponentContent: updateComponentContentTool,
  addExamplesToConcept: addExamplesToConceptTool,
  getCourseStructure: getCourseStructureTool,
  getDiscussionThread: getDiscussionThreadTool,
  createDiscussionThread: createDiscussionThreadTool,
  getUserSettings: getUserSettingsTool,
  updateUserSettings: updateUserSettingsTool,
  getSelfLearnerPathway: getSelfLearnerPathwayTool,
}

/**
 * All new AI tools combined (15 tools)
 */
export const advancedAITools = {
  // 讨论管理工具 (4个)
  createDiscussionThread: discussionManagementTools.createDiscussionThread,
  suggestDiscussionTopics: discussionManagementTools.suggestDiscussionTopics,
  analyzeDiscussionEngagement: discussionManagementTools.analyzeDiscussionEngagement,
  moderateDiscussionContent: discussionManagementTools.moderateDiscussionContent,

  // 设置优化工具 (4个)
  optimizeUserSettings: settingsOptimizationTools.optimizeUserSettings,
  suggestLearningPreferences: settingsOptimizationTools.suggestLearningPreferences,
  analyzeUsagePatterns: settingsOptimizationTools.analyzeUsagePatterns,
  recommendNotificationSettings: settingsOptimizationTools.recommendNotificationSettings,

  // 学习路径工具 (4个)
  createLearningPathway: learningPathTools.createLearningPathway,
  optimizePathwayProgress: learningPathTools.optimizePathwayProgress,
  suggestLearningResources: learningPathTools.suggestLearningResources,
  analyzeLearningEfficiency: learningPathTools.analyzeLearningEfficiency,

  // 个性化建议工具 (3个)
  generatePersonalizedRecommendations: personalizationTools.generatePersonalizedRecommendations,
  adaptContentDifficulty: personalizationTools.adaptContentDifficulty,
  createStudyReminders: personalizationTools.createStudyReminders,
}

/**
 * Complete tool collection
 */
export const allTools = {
  ...courseEditingTools,
  ...advancedAITools,
}

