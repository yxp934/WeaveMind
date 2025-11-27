import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
const MODEL_NAME = 'meituan/longcat-flash-chat'
const MAX_COMPONENTS_PER_CHAPTER = 6
const MAX_ITERATIONS_PER_CHAPTER = 3
const MIN_ITERATIONS_PER_CHAPTER = 3

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

function buildBuilderPrompt(courseTitle: string, chapter: ChapterRow, requirements: any, previousFeedback?: string): string {
  const audienceInfo = requirements?.audience || '初学者'
  const feedbackSection = previousFeedback
    ? `\n\n【上一轮 Critic 反馈】\n${previousFeedback}\n\n请根据以上反馈改进内容。`
    : ''

  return `你是一位经验丰富的课程内容设计专家。你的任务是为本章节创建高质量的学习组件。

【课程信息】
课程标题：${courseTitle}
章节标题：${chapter.title}
章节描述：${chapter.description || '无'}
课程需求：${JSON.stringify(requirements, null, 2)}
目标受众：${audienceInfo}
${feedbackSection}

【内容创作要求 - 必须严格遵守】

1. **详细讲解原则**：
   - 对每一个概念都要详细解释，不要假设学习者有任何先验知识
   - 使用类比、例子、场景来帮助理解
   - 解释"为什么"而不仅仅是"是什么"
   - 每个知识点都要讲透，不要一笔带过

2. **由浅入深原则**：
   - 从最基础的概念开始，逐步深入
   - 先介绍背景和动机，再介绍具体内容
   - 每个新概念都要建立在已讲解的概念之上
   - 使用渐进式的例子（从简单到复杂）

3. **段落式写作原则（严格禁止列点）**：
   - 使用连贯的段落，不要使用项目符号（•）或编号列表（1. 2. 3.）
   - 用自然的语言过渡，如"首先...接下来...然后...最后..."
   - 每个段落应该像在给学生讲故事一样流畅
   - 避免使用"要点如下"、"主要包括"等引出列表的表述

4. **组件类型使用**：
   - "text" 组件：用于讲解概念、原理、例子、场景
   - "question" 组件：用于检验理解，题目要有深度，不要太简单

5. **语言要求**：
   - 使用与课程需求相同的语言（中文或英文）
   - 语言要通俗易懂，避免过于学术化
   - 多使用"你"、"我们"等第二人称，增强互动感

【输出格式】
严格输出 JSON 格式（不要有任何额外文字）：
{
  "components": [
    {
      "type": "text",
      "text": "这里是详细的段落式讲解内容，要详细、连贯、由浅入深。不要使用列点。每个段落都要像在给学生讲课一样自然流畅。"
    },
    {
      "type": "question",
      "question": "基于上面的讲解，这里是一个检验理解的问题",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correctAnswer": "正确答案"
    }
  ]
}

【组件数量】
每章生成 3 到 ${MAX_COMPONENTS_PER_CHAPTER} 个组件。

记住：你的目标是让一个${audienceInfo}能够完全理解这个章节的内容，不要遗漏任何必要的解释。`
}

function buildCriticPrompt(courseTitle: string, chapter: ChapterRow, requirements: any, draftComponents: any, iteration: number): string {
  const audienceInfo = requirements?.audience || '初学者'
  const minIterations = MIN_ITERATIONS_PER_CHAPTER

  return `你是一位严格的课程内容评审专家。更重要的是，你要**假装自己是一个${audienceInfo}，而且是学习速度很慢、理解能力较弱的那种学生**。

【你的角色定位】
- 你是目标受众（${audienceInfo}）中学习最慢的那一类人
- 你需要非常详细的解释才能理解概念
- 你对任何跳跃、省略、假设都会感到困惑
- 你需要大量的例子和类比才能理解抽象概念
- 你看到列点就会觉得内容不连贯、难以理解

【课程信息】
课程标题：${courseTitle}
章节标题：${chapter.title}
章节描述：${chapter.description || '无'}
课程需求：${JSON.stringify(requirements, null, 2)}
当前迭代轮次：${iteration}/${MAX_ITERATIONS_PER_CHAPTER}

【待评审的内容】
${JSON.stringify(draftComponents, null, 2)}

【评审标准 - 必须严格执行】

**强制要求：前 ${minIterations} 轮必须找出问题！**
- 如果当前是第 ${iteration} 轮，且 ${iteration} <= ${minIterations}，你**必须**返回 "revise"
- 即使内容看起来不错，也要找出至少 3-5 个可以改进的地方
- 只有在第 ${minIterations + 1} 轮或之后，才可以考虑返回 "accept"

作为一个学习很慢的${audienceInfo}，你要从以下角度挑刺：

1. **详细程度检查**：
   - 有没有概念没有解释清楚？
   - 有没有跳过必要的背景知识？
   - 有没有使用了我可能不懂的术语而没有解释？
   - 例子够不够多？够不够具体？
   - 有没有只说"是什么"而没说"为什么"？

2. **由浅入深检查**：
   - 开头是不是太突兀，没有铺垫？
   - 有没有突然引入复杂概念而没有过渡？
   - 前后逻辑是否连贯？
   - 是否每个新概念都建立在已讲解的基础上？

3. **段落式写作检查（严格）**：
   - 有没有使用项目符号（•）？ → 如果有，必须要求改成段落
   - 有没有使用编号列表（1. 2. 3.）？ → 如果有，必须要求改成段落
   - 段落之间的过渡是否自然？
   - 语言是否像在讲课而不是在列清单？

4. **理解难度检查**：
   - 作为学习慢的学生，我能理解吗？
   - 有没有让我感到困惑的地方？
   - 有没有需要更多例子的地方？
   - 有没有需要更详细解释的地方？

5. **完整性检查**：
   - 章节描述中提到的内容都讲到了吗？
   - 有没有遗漏重要的知识点？
   - 问题是否真的能检验理解？

【输出格式】
严格输出 JSON 格式（不要有任何额外文字）：
{
  "verdict": "accept" | "revise",
  "feedback": "详细的反馈意见，要具体指出问题在哪里，如何改进"
}

【判断逻辑】
- 如果当前轮次 <= ${minIterations}：必须返回 "revise"，并找出至少 3-5 个具体问题
- 如果当前轮次 > ${minIterations}：
  - 如果内容真的很好（详细、连贯、无列点、由浅入深），可以返回 "accept"
  - 如果还有明显问题，继续返回 "revise"

记住：你是一个学习很慢的${audienceInfo}，要站在最需要帮助的学生角度来评审！`
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

  // Ensure we use at least MIN_ITERATIONS_PER_CHAPTER
  const requestedIterations = (run as RunRow).max_iterations_per_chapter || MAX_ITERATIONS_PER_CHAPTER
  const iterationsLimit = Math.max(requestedIterations, MIN_ITERATIONS_PER_CHAPTER)
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
  let previousFeedback: string | undefined = undefined

  while (iterations < iterationsLimit) {
    iterations += 1

    // Builder generates content (with previous feedback if available)
    const { text: builderText } = await generateText({
      model: openai.chat(MODEL_NAME),
      system: 'You are the Builder agent in a dual-agent system for course creation. Your goal is to create detailed, pedagogically sound content that helps slow learners understand concepts thoroughly.',
      prompt: buildBuilderPrompt(courseTitle, chapter, requirements, previousFeedback),
      temperature: 0.7,
    })

    const builderJson = extractJson(builderText)
    currentComponents = builderJson.components || []
    dialogue.push({ role: 'builder', turn: iterations, content: JSON.stringify(builderJson) })

    // Critic evaluates content (knows current iteration number)
    const { text: criticText } = await generateText({
      model: openai.chat(MODEL_NAME),
      system: 'You are the Critic agent. You pretend to be a slow learner from the target audience who needs very detailed explanations. You must find issues in the first few iterations to ensure quality.',
      prompt: buildCriticPrompt(courseTitle, chapter, requirements, builderJson, iterations),
      temperature: 0.3,
    })

    const criticJson = extractJson(criticText)
    const verdict = (criticJson.verdict || '').toLowerCase()
    const feedback = criticJson.feedback || ''
    dialogue.push({ role: 'critic', turn: iterations, content: JSON.stringify(criticJson) })

    // Store feedback for next iteration
    previousFeedback = feedback

    // Only accept if verdict is accept AND we've done minimum iterations
    if (verdict === 'accept' && iterations >= MIN_ITERATIONS_PER_CHAPTER) {
      break
    }

    // Force continue if we haven't reached minimum iterations
    if (iterations >= iterationsLimit) {
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

