/**
 * Phase 7: Learning Events Tracking
 * Utility functions for logging student learning events
 */

import { createClient } from '@/lib/supabase/client'

export type EventType =
  | 'view'
  | 'complete'
  | 'interact'
  | 'component_open'
  | 'component_complete'
  | 'ai_question_asked'
  | 'ai_question_answered'
  | 'assignment_submitted'
  | 'assignment_graded'
  | 'course_started'
  | 'chapter_started'
  | 'chapter_completed'

export interface LogEventParams {
  eventType: EventType
  courseId?: string
  chapterId?: string
  componentId?: string
  assignmentId?: string
  durationSeconds?: number
  metadata?: Record<string, any>
}

/**
 * Log a learning event to the database
 */
export async function logLearningEvent(params: LogEventParams) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('Cannot log learning event: user not authenticated')
    return null
  }

  const { data, error } = await supabase.from('learning_events').insert({
    user_id: user.id,
    course_id: params.courseId || null,
    chapter_id: params.chapterId || null,
    component_id: params.componentId || null,
    assignment_id: params.assignmentId || null,
    event_type: params.eventType,
    duration_seconds: params.durationSeconds || null,
    metadata: params.metadata || {},
  })

  if (error) {
    console.error('Error logging learning event:', error)
    return null
  }

  return data
}

/**
 * Log component open event
 */
export async function logComponentOpen(
  componentId: string,
  courseId: string,
  chapterId: string
) {
  return logLearningEvent({
    eventType: 'component_open',
    componentId,
    courseId,
    chapterId,
  })
}

/**
 * Log component complete event
 */
export async function logComponentComplete(
  componentId: string,
  courseId: string,
  chapterId: string,
  durationSeconds?: number
) {
  return logLearningEvent({
    eventType: 'component_complete',
    componentId,
    courseId,
    chapterId,
    durationSeconds,
  })
}

/**
 * Log AI question asked event
 */
export async function logAIQuestionAsked(
  componentId: string,
  courseId: string,
  question: string
) {
  return logLearningEvent({
    eventType: 'ai_question_asked',
    componentId,
    courseId,
    metadata: { question },
  })
}

/**
 * Log AI question answered event
 */
export async function logAIQuestionAnswered(
  componentId: string,
  courseId: string,
  question: string,
  answerLength: number
) {
  return logLearningEvent({
    eventType: 'ai_question_answered',
    componentId,
    courseId,
    metadata: { question, answerLength },
  })
}

/**
 * Log course started event
 */
export async function logCourseStarted(courseId: string) {
  return logLearningEvent({
    eventType: 'course_started',
    courseId,
  })
}

/**
 * Log chapter started event
 */
export async function logChapterStarted(
  chapterId: string,
  courseId: string
) {
  return logLearningEvent({
    eventType: 'chapter_started',
    chapterId,
    courseId,
  })
}

/**
 * Log chapter completed event
 */
export async function logChapterCompleted(
  chapterId: string,
  courseId: string,
  durationSeconds?: number
) {
  return logLearningEvent({
    eventType: 'chapter_completed',
    chapterId,
    courseId,
    durationSeconds,
  })
}

/**
 * Log assignment submitted event
 */
export async function logAssignmentSubmitted(assignmentId: string) {
  return logLearningEvent({
    eventType: 'assignment_submitted',
    assignmentId,
  })
}

