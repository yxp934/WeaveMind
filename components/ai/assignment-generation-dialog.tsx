'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Clock,
  FileQuestion,
  Lightbulb,
} from 'lucide-react'

interface Session {
  id: string
  session_number: number
  title: string
  description: string | null
  scheduled_date: string
}

interface Question {
  question_number: number
  question_type: 'mcq' | 'fill_blank' | 'code' | 'linking'
  question_text: string
  question_data: any
  answer_data: any
  estimated_time: number
  rationale: string
}

interface AssignmentGenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  classId: string
  className: string
}

type GenerationStep = 'initial' | 'review' | 'refining' | 'testing' | 'completed'
type QuestionType = 'mcq' | 'fill_blank' | 'code' | 'linking'

export function AssignmentGenerationDialog({
  open,
  onOpenChange,
  session,
  classId,
  className,
}: AssignmentGenerationDialogProps) {
  const [step, setStep] = useState<GenerationStep>('initial')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [targetDuration, setTargetDuration] = useState(20)
  const [feedback, setFeedback] = useState('')
  const [assignmentId, setAssignmentId] = useState<string | null>(null)
  const [testingResults, setTestingResults] = useState<any[]>([])
  const [totalEstimatedTime, setTotalEstimatedTime] = useState(0)
  const [coverageNotes, setCoverageNotes] = useState('')
  const [questionTypes, setQuestionTypes] = useState<Record<QuestionType, boolean>>({
    mcq: true,
    fill_blank: true,
    code: true,
    linking: true,
  })

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setStep('initial')
      setLoading(false)
      setError(null)
      setQuestions([])
      setFeedback('')
      setAssignmentId(null)
      setTestingResults([])
      setTotalEstimatedTime(0)
      setCoverageNotes('')
    }
  }, [open])

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/assignments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          targetDuration,
          questionTypes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate assignment')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setAssignmentId(data.assignmentId)
      setTotalEstimatedTime(data.totalEstimatedTime)
      setCoverageNotes(data.coverageNotes)
      setStep('review')

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefine = async () => {
    if (!assignmentId) return

    try {
      setLoading(true)
      setError(null)
      setStep('refining')

      const response = await fetch(`/api/assignments/${assignmentId}/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback || 'Please improve the assignment quality',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to refine assignment')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setTotalEstimatedTime(data.totalEstimatedTime)
      setCoverageNotes(data.coverageNotes)
      setFeedback('')
      setStep('review')

    } catch (err: any) {
      setError(err.message)
      setStep('review')
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    if (!assignmentId) return

    try {
      setLoading(true)
      setError(null)
      setStep('testing')

      const response = await fetch(`/api/assignments/${assignmentId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to test assignment')
      }

      const data = await response.json()
      setTestingResults(data.testingResults)

      // Always return to review step - teacher can choose next action
      setStep('review')

    } catch (err: any) {
      setError(err.message)
      setStep('review')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!assignmentId) return

    try {
      setLoading(true)

      const response = await fetch(`/api/assignments/${assignmentId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to publish assignment')
      }

      // Close dialog and refresh
      onOpenChange(false)
      window.location.reload()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderQuestion = (question: Question) => {
    const baseQuestionCard = (
      <Card key={question.question_number} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Q{question.question_number}
              </Badge>
              <Badge variant="outline">
                {question.question_type.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-3 w-3" />
              {question.estimated_time} min
            </div>
          </div>
          <CardTitle className="text-base mt-2">
            {question.question_text}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Render based on question type */}
          {question.question_type === 'mcq' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Options:</Label>
              {question.question_data.options?.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                  <span>{option}</span>
                </div>
              ))}
            </div>
          )}

          {question.question_type === 'fill_blank' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Question:</Label>
              <p className="text-sm bg-gray-50 p-3 rounded">
                {question.question_data.text_with_blanks}
              </p>
            </div>
          )}

          {question.question_type === 'code' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Problem:</Label>
              <p className="text-sm">{question.question_data.problem_description}</p>
              {question.question_data.starter_code && (
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                  <code>{question.question_data.starter_code}</code>
                </pre>
              )}
            </div>
          )}

          {question.question_type === 'linking' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Match the following:</Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Left Items:</Label>
                  <ul className="list-disc list-inside">
                    {question.question_data.left_items?.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Right Items:</Label>
                  <ul className="list-disc list-inside">
                    {question.question_data.right_items?.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-start gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <Label className="text-xs font-medium text-gray-500">Rationale:</Label>
                <p className="text-gray-700">{question.rationale}</p>
              </div>
            </div>
          </div>

          {testingResults.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              {testingResults.find(r => r.question_number === question.question_number) && (
                <div className="flex items-center gap-2 text-sm">
                  {testingResults.find(r => r.question_number === question.question_number)?.isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-gray-600">
                    {testingResults.find(r => r.question_number === question.question_number)?.isCorrect
                      ? 'Student answered correctly'
                      : 'Student needs help with this question'}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )

    return baseQuestionCard
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Generate Assignment for Session {session.session_number}
          </DialogTitle>
          <DialogDescription>
            {session.title || `Session ${session.session_number}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'initial' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="duration">Target Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value) || 20)}
                    min={5}
                    max={60}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    The assignment will be designed to take approximately this long
                  </p>
                </div>

                <div>
                  <Label className="text-base font-medium">Question Types to Include</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {Object.entries(questionTypes).map(([type, enabled]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={enabled}
                          onCheckedChange={(checked) =>
                            setQuestionTypes(prev => ({
                              ...prev,
                              [type]: checked as boolean
                            }))
                          }
                        />
                        <Label htmlFor={type} className="text-sm font-normal cursor-pointer">
                          {type === 'mcq' && 'Multiple Choice Questions'}
                          {type === 'fill_blank' && 'Fill in the Blanks'}
                          {type === 'code' && 'Code Questions'}
                          {type === 'linking' && 'Matching Questions'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Assignment...
                  </>
                ) : (
                  'Generate Assignment'
                )}
              </Button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Generated Assignment</h3>
                  <p className="text-sm text-gray-500">
                    Total estimated time: {totalEstimatedTime} minutes
                  </p>
                  {coverageNotes && (
                    <p className="text-sm text-gray-600 mt-1">{coverageNotes}</p>
                  )}
                </div>
                <Badge variant="outline">{questions.length} Questions</Badge>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {questions.map(renderQuestion)}
              </ScrollArea>

              <div className="space-y-3">
                <Label htmlFor="feedback">Feedback for AI (optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g., Make it more challenging, Add more questions, Explain topic X better..."
                  className="min-h-[80px]"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleTest}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Test with Student Agent
                    </>
                  )}
                </Button>

                {feedback && (
                  <Button
                    onClick={handleRefine}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refining...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refine with Feedback
                      </>
                    )}
                  </Button>
                )}

                {/* Show publish button only if all tests passed */}
                {testingResults.length > 0 && testingResults.every((r: any) => r.isCorrect) && (
                  <Button
                    onClick={handlePublish}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Publish Assignment
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'refining' && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
                <p className="text-gray-600">Refining assignment based on your feedback...</p>
              </div>
            </div>
          )}

          {step === 'testing' && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
                <p className="text-gray-600">Testing assignment with student agent...</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
