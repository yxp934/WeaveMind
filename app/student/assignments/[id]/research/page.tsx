'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Save,
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  History,
} from 'lucide-react'

interface ResearchAssignment {
  id: string
  title: string
  description: string
  instructions: string
  due_date: string | null
  max_score: number
  word_limit: number | null
  research_guidelines: string | null
  ai_assistance_allowed: boolean
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  session_title: string
  messages: Message[]
  created_at: string
  updated_at: string
}

export default function ResearchAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [assignment, setAssignment] = useState<ResearchAssignment | null>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [content, setContent] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [error, setError] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [newMessage, setNewMessage] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAssignmentAndSubmission()
    fetchConversations()
  }, [id])

  useEffect(() => {
    // Count words
    const count = content.trim().split(/\s+/).filter(word => word.length > 0).length
    setWordCount(count)
  }, [content])

  useEffect(() => {
    // Scroll to bottom of chat when new messages arrive
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation?.messages])

  const fetchAssignmentAndSubmission = async () => {
    try {
      // Fetch assignment details
      const assignmentResponse = await fetch(`/api/assignments/${id}`)
      if (!assignmentResponse.ok) {
        throw new Error('Failed to fetch assignment')
      }
      const assignmentData = await assignmentResponse.json()
      setAssignment(assignmentData.assignment)

      // Fetch submission
      const submissionResponse = await fetch(`/api/assignments/${id}/submissions/research`)
      if (submissionResponse.ok) {
        const submissionData = await submissionResponse.json()
        if (submissionData.submission) {
          setSubmission(submissionData.submission)
          setContent(submissionData.submission.content || '')
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/assignments/research/${id}/chat`)
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err)
    }
  }

  const startNewConversation = () => {
    setCurrentConversation({
      id: '',
      session_title: `New Chat`,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !assignment?.ai_assistance_allowed) return

    setChatLoading(true)
    const userMessage = newMessage.trim()
    setNewMessage('')

    let updatedMessages: Message[]

    if (!currentConversation || !currentConversation.id) {
      // Start new conversation
      updatedMessages = [
        ...(currentConversation?.messages || []),
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
      ]
    } else {
      // Add to existing conversation
      updatedMessages = [
        ...currentConversation.messages,
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
      ]
    }

    // Update UI immediately with user message
    setCurrentConversation(prev => prev ? {
      ...prev,
      messages: updatedMessages,
    } : null)

    try {
      const response = await fetch(`/api/assignments/research/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentConversation?.id || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      const data = await response.json()
      setCurrentConversation(data.conversation)
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === data.conversation.id)
        if (index >= 0) {
          const newConversations = [...prev]
          newConversations[index] = data.conversation
          return newConversations
        } else {
          return [data.conversation, ...prev]
        }
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChatLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/assignments/${id}/submissions/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          researchNotes: currentConversation ? JSON.stringify(currentConversation.messages) : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save submission')
      }

      const data = await response.json()
      setSubmission(data.submission)

      // Show success message
      alert('Submission saved successfully!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assignment not found</h2>
          <Link href="/student">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/student" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Assignments</span>
            </Link>
            <h1 className="text-xl font-bold text-indigo-600">WeaveMind</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Research Assignment</h2>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{assignment.title}</h3>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Assignment Details and Submission */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">Assignment Details</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    {assignment.due_date && (
                      <Badge variant={new Date(assignment.due_date) < new Date() ? "destructive" : "secondary"}>
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Max Score: {assignment.max_score}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignment.description && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Description</h4>
                    <p className="text-gray-600">{assignment.description}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Instructions</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{assignment.instructions}</p>
                </div>
                {assignment.research_guidelines && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Research Guidelines</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{assignment.research_guidelines}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Word Limit</h4>
                    <p className="text-gray-600">{assignment.word_limit || 'No limit'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">AI Assistance</h4>
                    <p className="text-gray-600">{assignment.ai_assistance_allowed ? 'Allowed' : 'Not allowed'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Your Research Paper</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {assignment.word_limit && (
                      <span className={wordCount > assignment.word_limit ? 'text-red-600 font-semibold' : ''}>
                        Words: {wordCount} / {assignment.word_limit}
                      </span>
                    )}
                    {submission?.submitted_at && (
                      <Badge variant="outline">
                        Last saved: {new Date(submission.submitted_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[400px]"
                  placeholder="Write your research paper here..."
                />
                <Button onClick={handleSave} disabled={saving || !content.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Chat */}
          {assignment.ai_assistance_allowed && (
            <div className="lg:col-span-1">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bot className="h-5 w-5 text-purple-600" />
                      AI Research Assistant
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startNewConversation}
                    >
                      New Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
                  {conversations.length > 0 && !currentConversation && (
                    <div className="flex-1 overflow-y-auto space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Previous Chats
                      </h4>
                      {conversations.map((conv) => (
                        <Button
                          key={conv.id}
                          variant="outline"
                          className="w-full justify-start text-left"
                          onClick={() => setCurrentConversation(conv)}
                        >
                          <div>
                            <div className="font-medium text-sm">{conv.session_title}</div>
                            <div className="text-xs text-gray-500">
                              {conv.messages.length} messages
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}

                  {currentConversation && (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {currentConversation.messages.map((message, idx) => (
                          <div
                            key={idx}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                message.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {message.role === 'assistant' && (
                                  <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                )}
                                {message.role === 'user' && (
                                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-3 py-2 max-w-[80%]">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-gray-600">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <div className="flex-shrink-0">
                        {!assignment.ai_assistance_allowed && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 mb-2">
                            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-semibold text-amber-800">AI Assistance Disabled</p>
                              <p className="text-amber-700">
                                Your teacher has disabled AI assistance for this assignment.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask the AI assistant..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={chatLoading || !assignment.ai_assistance_allowed}
                          />
                          <Button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || chatLoading || !assignment.ai_assistance_allowed}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
