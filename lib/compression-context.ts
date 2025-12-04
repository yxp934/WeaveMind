import { createClient } from './supabase/server'

export interface CompressionContext {
  id?: string
  course_id?: string
  class_id: string
  organization_id: string
  compressed_summary: string
  key_concepts: string[]
  learning_objectives: string[]
  session_contexts: any[]
  teaching_method?: string
  target_audience?: string
  prerequisites: string[]
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  total_duration_minutes?: number
  version?: number
  quality_score?: number
  last_updated?: string
  created_at?: string
}

export interface ExtractionEvent {
  id?: string
  context_id: string
  extraction_type: 'schedule_generation' | 'session_content_generation' | 'assignment_generation' | 'manual_update' | 'quality_refinement'
  source_type: 'schedule' | 'session' | 'chapter' | 'component' | 'assignment' | 'submission' | 'conversation'
  source_id?: string
  extracted_content: any
  processing_status?: 'pending' | 'processed' | 'merged' | 'archived'
  metadata?: any
}

export class CompressionContextService {
  private supabase: any

  constructor() {
    this.initializeClient()
  }

  private async initializeClient() {
    this.supabase = await createClient()
  }

  /**
   * Get or create compression context for a class
   */
  async getOrCreateContext(classId: string, organizationId: string): Promise<CompressionContext | null> {
    if (!this.supabase) {
      await this.initializeClient()
    }

    // Try to get existing context
    const { data, error } = await this.supabase
      .from('course_compression_context')
      .select('*')
      .eq('class_id', classId)
      .single()

    if (data) {
      return data as CompressionContext
    }

    // If not found, create initial context
    return this.createInitialContext(classId, organizationId)
  }

  /**
   * Create initial compression context for a class
   */
  async createInitialContext(classId: string, organizationId: string): Promise<CompressionContext | null> {
    if (!this.supabase) {
      await this.initializeClient()
    }

    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get class details
    const { data: classData, error: classError } = await this.supabase
      .from('classes')
      .select('id, name, description, created_by')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      throw new Error('Class not found')
    }

    if (classData.created_by !== user.id) {
      throw new Error('Access denied')
    }

    const initialContext: CompressionContext = {
      class_id: classId,
      organization_id: organizationId,
      compressed_summary: `Initial context for ${classData.name}`,
      key_concepts: [],
      learning_objectives: [],
      session_contexts: [],
      prerequisites: []
    }

    const { data, error } = await this.supabase
      .from('course_compression_context')
      .insert(initialContext)
      .select()
      .single()

    if (error) {
      console.error('Error creating compression context:', error)
      throw error
    }

    return data as CompressionContext
  }

  /**
   * Update compression context with new information
   */
  async updateContext(
    contextId: string,
    updates: Partial<CompressionContext>
  ): Promise<CompressionContext | null> {
    if (!this.supabase) {
      await this.initializeClient()
    }

    const { data, error } = await this.supabase
      .from('course_compression_context')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', contextId)
      .select()
      .single()

    if (error) {
      console.error('Error updating compression context:', error)
      throw error
    }

    return data as CompressionContext
  }

  /**
   * Add extraction event to context
   */
  async addExtractionEvent(
    contextId: string,
    event: Omit<ExtractionEvent, 'id' | 'context_id'>
  ): Promise<ExtractionEvent | null> {
    if (!this.supabase) {
      await this.initializeClient()
    }

    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const extractionEvent: Omit<ExtractionEvent, 'id'> = {
      context_id: contextId,
      extraction_type: event.extraction_type,
      source_type: event.source_type,
      source_id: event.source_id,
      extracted_content: event.extracted_content,
      processing_status: 'pending',
      metadata: event.metadata || {}
    }

    const { data, error } = await this.supabase
      .from('context_extraction_events')
      .insert(extractionEvent)
      .select()
      .single()

    if (error) {
      console.error('Error adding extraction event:', error)
      throw error
    }

    return data as ExtractionEvent
  }

  /**
   * Extract and merge information from schedule generation
   */
  async extractFromScheduleGeneration(
    classId: string,
    organizationId: string,
    scheduleContext: any,
    conversationContext?: string
  ): Promise<CompressionContext | null> {
    try {
      // Get or create context
      let context = await this.getOrCreateContext(classId, organizationId)
      if (!context) {
        return null
      }

      // Extract key information from schedule context
      const extractedInfo = {
        compressed_summary: `Class on ${scheduleContext.class_topic || 'Unknown Topic'}`,
        key_concepts: scheduleContext.session_details?.map((s: any) => s.topic).filter(Boolean) || [],
        learning_objectives: scheduleContext.learning_goals ? [scheduleContext.learning_goals] : [],
        teaching_method: scheduleContext.teaching_method,
        target_audience: scheduleContext.target_audience,
        session_contexts: scheduleContext.session_details || [],
        total_duration_minutes: (scheduleContext.total_sessions || 0) * 90 // Assume 90 min per session
      }

      // Update context
      context = await this.updateContext(context.id!, extractedInfo)

      // Add extraction event
      if (context) {
        await this.addExtractionEvent(context.id!, {
          extraction_type: 'schedule_generation',
          source_type: 'schedule',
          extracted_content: scheduleContext,
          metadata: { conversation_context }
        })
      }

      return context
    } catch (error) {
      console.error('Error extracting from schedule generation:', error)
      throw error
    }
  }

  /**
   * Extract and merge information from session content generation
   */
  async extractFromSessionGeneration(
    classId: string,
    organizationId: string,
    sessionData: any,
    generatedComponents: any[]
  ): Promise<CompressionContext | null> {
    try {
      // Get or create context
      let context = await this.getOrCreateContext(classId, organizationId)
      if (!context) {
        return null
      }

      // Extract concepts from generated components
      const concepts = this.extractConceptsFromComponents(generatedComponents)

      // Update context
      const updatedInfo = {
        key_concepts: [...new Set([...context.key_concepts, ...concepts])],
        session_contexts: [
          ...(context.session_contexts || []),
          {
            session_number: sessionData.session_number,
            session_title: sessionData.title,
            components_count: generatedComponents.length,
            key_concepts: concepts,
            generated_at: new Date().toISOString()
          }
        ]
      }

      context = await this.updateContext(context.id!, updatedInfo)

      // Add extraction event
      if (context) {
        await this.addExtractionEvent(context.id!, {
          extraction_type: 'session_content_generation',
          source_type: 'session',
          source_id: sessionData.session_id,
          extracted_content: {
            session_data: sessionData,
            generated_components: generatedComponents
          },
          metadata: { concept_count: concepts.length }
        })
      }

      return context
    } catch (error) {
      console.error('Error extracting from session generation:', error)
      throw error
    }
  }

  /**
   * Extract concepts from generated components
   */
  private extractConceptsFromComponents(components: any[]): string[] {
    const concepts: string[] = []

    components.forEach(component => {
      if (component.type === 'text' && component.content?.text) {
        // Extract key terms from text components
        const text = component.content.text as string
        // Simple keyword extraction - in practice, could use more sophisticated NLP
        const words = text.split(/\s+/).filter(word =>
          word.length > 4 &&
          !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'have'].includes(word.toLowerCase())
        )
        concepts.push(...words.slice(0, 5)) // Take first 5 keywords per component
      }
    })

    return [...new Set(concepts)] // Remove duplicates
  }

  /**
   * Get compression context with all extraction events
   */
  async getContextWithEvents(contextId: string): Promise<{
    context: CompressionContext | null
    events: ExtractionEvent[]
  }> {
    if (!this.supabase) {
      await this.initializeClient()
    }

    const { data: context, error: contextError } = await this.supabase
      .from('course_compression_context')
      .select('*')
      .eq('id', contextId)
      .single()

    if (contextError) {
      throw contextError
    }

    const { data: events, error: eventsError } = await this.supabase
      .from('context_extraction_events')
      .select('*')
      .eq('context_id', contextId)
      .order('created_at', { ascending: false })

    if (eventsError) {
      throw eventsError
    }

    return {
      context: context as CompressionContext,
      events: (events || []) as ExtractionEvent[]
    }
  }

  /**
   * Trigger context refinement using AI
   */
  async refineContext(contextId: string): Promise<CompressionContext | null> {
    if (!this.supabase) {
      await this.initializeClient()
    }

    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Call the database function to process extraction events
    const { data, error } = await this.supabase
      .rpc('process_context_extraction_events', {
        p_context_id: contextId,
        p_created_by: user.id
      })

    if (error) {
      console.error('Error refining context:', error)
      throw error
    }

    // Get updated context
    const { data: updatedContext, error: fetchError } = await this.supabase
      .from('course_compression_context')
      .select('*')
      .eq('id', contextId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    return updatedContext as CompressionContext
  }

  /**
   * Get compression context for a class (convenience method for API routes)
   */
  async getCompressionContext(classId: string): Promise<CompressionContext | null> {
    if (!this.supabase) {
      await this.initializeClient()
    }

    const { data, error } = await this.supabase
      .from('course_compression_context')
      .select('*')
      .eq('class_id', classId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return data as CompressionContext | null
  }
}

// Export singleton instance
export const compressionContextService = new CompressionContextService()
