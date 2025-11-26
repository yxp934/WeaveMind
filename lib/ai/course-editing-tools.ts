/**
 * Phase 5: Course Editing Tools
 * 
 * This module defines structured editing tools that can be invoked by AI
 * to safely modify course content across chapters and components.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type ComponentType = 'text' | 'image' | 'video' | 'question' | 'interactive'

export interface EditingToolResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

/**
 * Insert a new component into a chapter
 */
export async function insertComponent(params: {
  chapterId: string
  type: ComponentType
  content: any
  position?: number // If not specified, append to end
}): Promise<EditingToolResult> {
  try {
    const supabase = createAdminClient()
    const { chapterId, type, content, position } = params

    // Get current components to determine order_index
    const { data: existingComponents } = await supabase
      .from('components')
      .select('order_index')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: true })

    let orderIndex: number
    if (position !== undefined && existingComponents) {
      // Insert at specific position, shift others
      orderIndex = position
      await supabase
        .from('components')
        .update({ order_index: supabase.rpc('increment', { amount: 1 }) })
        .eq('chapter_id', chapterId)
        .gte('order_index', position)
    } else {
      // Append to end
      orderIndex = existingComponents && existingComponents.length > 0
        ? Math.max(...existingComponents.map(c => c.order_index)) + 1
        : 0
    }

    const { data, error } = await supabase
      .from('components')
      .insert({
        chapter_id: chapterId,
        type,
        content,
        order_index: orderIndex,
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: `Component inserted successfully at position ${orderIndex}`,
      data,
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to insert component',
      error: error.message,
    }
  }
}

/**
 * Move a component to a different position within the same chapter or to another chapter
 */
export async function moveComponent(params: {
  componentId: string
  targetChapterId?: string
  targetPosition: number
}): Promise<EditingToolResult> {
  try {
    const supabase = createAdminClient()
    const { componentId, targetChapterId, targetPosition } = params

    // Get current component
    const { data: component, error: fetchError } = await supabase
      .from('components')
      .select('*')
      .eq('id', componentId)
      .single()

    if (fetchError || !component) throw new Error('Component not found')

    const sourceChapterId = component.chapter_id
    const finalChapterId = targetChapterId || sourceChapterId

    // If moving within same chapter, just update order_index
    if (sourceChapterId === finalChapterId) {
      // Shift components between old and new positions
      const { error: updateError } = await supabase
        .from('components')
        .update({
          chapter_id: finalChapterId,
          order_index: targetPosition,
        })
        .eq('id', componentId)

      if (updateError) throw updateError
    } else {
      // Moving to different chapter
      await supabase
        .from('components')
        .update({
          chapter_id: finalChapterId,
          order_index: targetPosition,
        })
        .eq('id', componentId)
    }

    return {
      success: true,
      message: `Component moved to position ${targetPosition}`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to move component',
      error: error.message,
    }
  }
}

/**
 * Delete a component
 */
export async function deleteComponent(params: {
  componentId: string
}): Promise<EditingToolResult> {
  try {
    const supabase = createAdminClient()
    const { componentId } = params

    const { error } = await supabase
      .from('components')
      .delete()
      .eq('id', componentId)

    if (error) throw error

    return {
      success: true,
      message: 'Component deleted successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete component',
      error: error.message,
    }
  }
}

/**
 * Update component content
 */
export async function updateComponentContent(params: {
  componentId: string
  content: any
  merge?: boolean // If true, merge with existing content; if false, replace
}): Promise<EditingToolResult> {
  try {
    const supabase = createAdminClient()
    const { componentId, content, merge = false } = params

    if (merge) {
      // Get existing content and merge
      const { data: existing } = await supabase
        .from('components')
        .select('content')
        .eq('id', componentId)
        .single()

      if (existing) {
        const mergedContent = { ...existing.content, ...content }
        const { error } = await supabase
          .from('components')
          .update({ content: mergedContent })
          .eq('id', componentId)

        if (error) throw error
      }
    } else {
      // Replace content entirely
      const { error } = await supabase
        .from('components')
        .update({ content })
        .eq('id', componentId)

      if (error) throw error
    }

    return {
      success: true,
      message: 'Component content updated successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update component content',
      error: error.message,
    }
  }
}

/**
 * Add examples to text components across multiple chapters
 */
export async function addExamplesToConcept(params: {
  courseId: string
  conceptKeyword: string
  examples: string[]
}): Promise<EditingToolResult> {
  try {
    const supabase = createAdminClient()
    const { courseId, conceptKeyword, examples } = params

    // Get all chapters for this course
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('course_id', courseId)

    if (!chapters || chapters.length === 0) {
      return {
        success: false,
        message: 'No chapters found for this course',
      }
    }

    const chapterIds = chapters.map(c => c.id)

    // Find all text components that mention the concept
    const { data: components } = await supabase
      .from('components')
      .select('*')
      .in('chapter_id', chapterIds)
      .eq('type', 'text')

    if (!components) {
      return {
        success: false,
        message: 'No text components found',
      }
    }

    // Filter components that contain the concept keyword
    const relevantComponents = components.filter(c => {
      const text = c.content?.text || ''
      return text.toLowerCase().includes(conceptKeyword.toLowerCase())
    })

    // Add examples to each relevant component
    let updatedCount = 0
    for (const component of relevantComponents) {
      const currentText = component.content?.text || ''
      const examplesText = '\n\n**Examples:**\n' + examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')
      const newText = currentText + examplesText

      await supabase
        .from('components')
        .update({
          content: { ...component.content, text: newText }
        })
        .eq('id', component.id)

      updatedCount++
    }

    return {
      success: true,
      message: `Added examples to ${updatedCount} components containing "${conceptKeyword}"`,
      data: { updatedCount },
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to add examples',
      error: error.message,
    }
  }
}

/**
 * Regenerate questions for a specific component or all question components in a chapter
 */
export async function regenerateQuestions(params: {
  componentId?: string
  chapterId?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}): Promise<EditingToolResult> {
  try {
    // This would integrate with AI to regenerate questions
    // For now, return a placeholder
    return {
      success: false,
      message: 'Question regeneration requires AI integration (to be implemented)',
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to regenerate questions',
      error: error.message,
    }
  }
}

