'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AssignmentTypeSelectorDialog } from '@/components/ai/assignment-type-selector-dialog'

export function CreateAssignmentButton({ classId, className }: { classId: string; className: string }) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Create Assignment
      </Button>
      <AssignmentTypeSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classId={classId}
        className={className}
      />
    </>
  )
}
