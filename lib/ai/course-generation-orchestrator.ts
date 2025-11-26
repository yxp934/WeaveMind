import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
const MODEL_NAME = 'meituan/longcat-flash-chat'
const MAX_COMPONENTS_PER_CHAPTER = 6
const MAX_ITERATIONS_PER_CHAPTER = 2

type DialogueTurn = { role: 'builder' | 'critic'; turn: number; content: string }

type CourseOutlineRow = {
  requirements: any
  chapters: Array<{ title: string; description?: string }>
}

type ChapterRow = {
  id: string
  course_id: string
  title: string
  description: string | null
  order_index: number
}

type RunRow = {
  id: string
  course_id: string
  created_by: string
  max_iterations_per_chapter: number | null
}

function ensureGatewayClient() {
  const gatewayKey = process.env.VERCEL_GATEWAY_KEY
  if (!gatewayKey) {
    throw new Error('AI Gateway not configured (VERCEL_GATEWAY_KEY missing)')
  }
  return createOpenAI({ apiKey: gatewayKey, baseURL: GATEWAY_BASE_URL })
}

function extractJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/[{\[][\s\S]*[}\]]/)
    if (match) return JSON.parse(match[0])
    throw new Error('Failed to parse JSON from AI response')
  }
}

function buildBuilderPrompt(courseTitle: string, chapter: ChapterRow, requirements: any): string {
  return `You are an expert course content builder. Based on the course and chapter information, generate a small sequence of learning components for this chapter.\n\nCourse title: ${courseTitle}\nChapter: ${chapter.title}\nChapter description: ${chapter.description || 'N/A'}\nHigh level course requirements: ${JSON.stringify(requirements)}\n\nOutput strictly valid JSON with this structure (no extra text):\n{\n  "components": [\n    {"type": "text", "text": "..."},\n    {"type": "question", "question": "...", "options": ["...", "..."], "correctAnswer": "..."}\n  ]\n}\n\nUse only these component types: "text" and "question".\nRules:\n- 3 to ${MAX_COMPONENTS_PER_CHAPTER} components per chapter.\n- Use the same language (Chinese or English) as the requirements.\n- Keep each component concise and pedagogically useful.`
}

function buildCriticPrompt(courseTitle: string, chapter: ChapterRow, requirements: any, draftComponents: any): string {
  return `You are a strict course content critic. Evaluate the proposed components for this chapter.\n\nCourse title: ${courseTitle}\nChapter: ${chapter.title}\nChapter description: ${chapter.description || 'N/A'}\nHigh level course requirements: ${JSON.stringify(requirements)}\n\nProposed components (JSON): ${JSON.stringify(draftComponents)}\n\nReturn strictly valid JSON with this structure (no extra text):\n{\n  "verdict": "accept" | "revise",\n  "feedback": "short explanation of issues or confirmation"\n}\n\nIf the components are pedagogically sound, coherent, and match the stated requirements, respond with verdict "accept". Otherwise respond with verdict "revise" and concrete feedback.`
}

export async function runCourseGeneration(runId: string) {
  const supabase = createAdminClient()

  const { data: run, error: runError } = await supabase
    .from('ai_generation_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (runError || !run) throw new Error(`Generation run not found: ${runError?.message || runId}`)

  await supabase
    .from('ai_generation_runs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', runId)

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, description')
    .eq('id', run.course_id)
    .single()

  if (courseError || !course) throw new Error(`Course not found for run ${runId}`)

  const { data: outline } = await supabase
    .from('course_outlines')
    .select('requirements, chapters')
    .eq('course_id', course.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: existingChapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })

  let chapters: ChapterRow[] = (existingChapters || []) as ChapterRow[]

  if ((!chapters || chapters.length === 0) && outline) {
    const outlineChapters = (outline as CourseOutlineRow).chapters || []
    if (outlineChapters.length === 0) {
      throw new Error('No chapters available in outline to generate from')
    }
    const insertPayload = outlineChapters.map((ch, index) => ({
      course_id: course.id,
      title: ch.title,
      description: ch.description ?? null,
      order_index: index,
    }))
    const { data: inserted, error: insertError } = await supabase
      .from('chapters')
      .insert(insertPayload)
      .select('*')
    if (insertError || !inserted) throw insertError || new Error('Failed to create chapters from outline')
    chapters = inserted as ChapterRow[]
  }

  if (!chapters || chapters.length === 0) {
    throw new Error('No chapters found for course, cannot generate content')
  }

  const iterationsLimit = (run as RunRow).max_iterations_per_chapter || MAX_ITERATIONS_PER_CHAPTER
  const openai = ensureGatewayClient()

  let completed = 0

  for (const chapter of chapters) {
    try {
      await runChapterGeneration({
        supabase,
        openai,
        runId,
        courseTitle: course.title,
        chapter,
        requirements: outline ? (outline as CourseOutlineRow).requirements : null,
        iterationsLimit,
      })
      completed += 1
      await supabase
        .from('ai_generation_runs')
        .update({
          completed_chapters: completed,
          total_chapters: chapters.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId)
    } catch (err) {
      await supabase
        .from('ai_generation_chapter_results')
        .update({ status: 'failed', error_message: (err as Error).message, updated_at: new Date().toISOString() })
        .eq('run_id', runId)
        .eq('chapter_id', chapter.id)
    }
  }

  const finalStatus = completed === chapters.length ? 'completed' : 'failed'
  await supabase
    .from('ai_generation_runs')
    .update({ status: finalStatus, updated_at: new Date().toISOString(), total_chapters: chapters.length, completed_chapters: completed })
    .eq('id', runId)
}

async function runChapterGeneration(params: {
  supabase: any
  openai: ReturnType<typeof createOpenAI>
  runId: string
  courseTitle: string
  chapter: ChapterRow
  requirements: any
  iterationsLimit: number
}) {
  const { supabase, openai, runId, courseTitle, chapter, requirements, iterationsLimit } = params

  const dialogue: DialogueTurn[] = []

  await supabase
    .from('ai_generation_chapter_results')
    .upsert({
      run_id: runId,
      chapter_id: chapter.id,
      status: 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'run_id,chapter_id' })

  let currentComponents: any = null
  let iterations = 0

  while (iterations < iterationsLimit) {
    iterations += 1

    const { text: builderText } = await generateText({
      model: openai.chat(MODEL_NAME),
      system: 'You are the Builder agent in a dual-agent system for course creation.',
      prompt: buildBuilderPrompt(courseTitle, chapter, requirements),
      temperature: 0.7,
    })

    const builderJson = extractJson(builderText)
    currentComponents = builderJson.components || []
    dialogue.push({ role: 'builder', turn: iterations, content: JSON.stringify(builderJson) })

    const { text: criticText } = await generateText({
      model: openai.chat(MODEL_NAME),
      system: 'You are the Critic agent evaluating course content for quality, clarity, and alignment with goals.',
      prompt: buildCriticPrompt(courseTitle, chapter, requirements, builderJson),
      temperature: 0.3,
    })

    const criticJson = extractJson(criticText)
    const verdict = (criticJson.verdict || '').toLowerCase()
    dialogue.push({ role: 'critic', turn: iterations, content: JSON.stringify(criticJson) })

    if (verdict === 'accept' || iterations >= iterationsLimit) {
      break
    }
  }

  await supabase
    .from('ai_generation_chapter_results')
    .upsert({
      run_id: runId,
      chapter_id: chapter.id,
      status: 'completed',
      iterations_used: iterations,
      builder_critic_dialogue: dialogue,
      proposed_components: currentComponents || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'run_id,chapter_id' })
}

