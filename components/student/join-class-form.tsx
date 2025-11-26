"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function JoinClassForm() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const trimmed = code.trim()
    if (!trimmed) {
      setError("Please enter a class join code.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/student/join-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Failed to join class.")
      }

      setSuccess(
        data.class?.name
          ? `Successfully joined class "${data.class.name}".`
          : "Successfully joined class."
      )
      setCode("")
      router.refresh()
    } catch (err: any) {
      console.error("Join class failed:", err)
      setError(err.message || "Failed to join class.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 border-t pt-6">
      <h4 className="text-lg font-semibold mb-2">Join a Class</h4>
      <p className="text-sm text-gray-500 mb-4">
        Enter the invitation code provided by your teacher to join their class.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 3fa85a1c"
          className="w-full sm:max-w-xs"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Joining..." : "Join Class"}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
    </div>
  )
}
