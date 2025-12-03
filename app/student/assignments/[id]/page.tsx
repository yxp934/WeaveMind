'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StudentAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAssignmentType = async () => {
      try {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('assignment_subtype')
          .eq('id', id)
          .single()

        if (!assignment) {
          router.push('/student')
          return
        }

        // Redirect to appropriate page based on assignment type
        switch (assignment.assignment_subtype) {
          case 'writing':
            router.replace(`/student/assignments/${id}/writing`)
            break
          case 'research':
            router.replace(`/student/assignments/${id}/research`)
            break
          case 'ai_generated':
          default:
            router.replace(`/student/assignments/${id}/questions`)
            break
        }
      } catch (error) {
        console.error('Error checking assignment type:', error)
        router.push('/student')
      }
    }

    checkAssignmentType()
  }, [id, router, supabase])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading assignment...</p>
      </div>
    </div>
  )
}
