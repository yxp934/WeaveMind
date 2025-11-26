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
}

