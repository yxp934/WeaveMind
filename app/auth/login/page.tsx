"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowLeft } from "lucide-react"

interface RetroTextProps {
  text: string;
}

function RetroText({ text }: RetroTextProps) {
  return (
    <div className="relative inline-block" style={{ minHeight: '1.2em' }}>
      {/* Layer 1 - Semi-transparent */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%] opacity-50">
        <div className="flex flex-col font-['Slackey:Regular',sans-serif] justify-center leading-[0] not-italic text-[#3fa11b] text-center text-nowrap">
          <p className="leading-[normal] whitespace-pre">{text}</p>
        </div>
      </div>

      {/* Layer 2 - Full opacity, same color */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%]">
        <div className="flex flex-col font-['Slackey:Regular',sans-serif] justify-center leading-[0] not-italic text-[#3fa11b] text-center text-nowrap">
          <p className="leading-[normal] whitespace-pre">{text}</p>
        </div>
      </div>

      {/* Layer 3 - Darker shade */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%]">
        <div className="flex flex-col font-['Slackey:Regular',sans-serif] justify-center leading-[0] not-italic text-[#1f5a0f] text-center text-nowrap">
          <p className="leading-[normal] whitespace-pre">{text}</p>
        </div>
      </div>

      {/* Invisible text to maintain layout space */}
      <div className="invisible flex flex-col font-['Slackey:Regular',sans-serif] justify-center leading-[0] not-italic text-center text-nowrap">
        <p className="leading-[normal] whitespace-pre">{text}</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Get the current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Failed to get user after login")
        return
      }

      // Check if user has a role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) throw profileError

      // Use window.location.href instead of router.push to avoid middleware issues
      const redirectUrl = profile?.role ? `/${profile.role}` : "/role-select"
      window.location.href = redirectUrl
    } catch (err: any) {
      setError(err.message || "Failed to login")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Background */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-green-600 to-green-700">
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md space-y-6 text-center text-white"
          >
            <h2 className="text-4xl font-bold mb-4">
              Welcome Back
            </h2>
            <p className="text-lg text-green-100">
              Continue your journey with AI-powered teaching and learning.
            </p>
          </motion.div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full" />
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </button>

          {/* Header */}
          <div className="space-y-2">
            <div className="mb-6 scale-75 origin-left">
              <RetroText text="WeaveMind" />
            </div>
            <h1 className="text-3xl text-gray-900">Welcome back</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="text-sm text-green-600 hover:underline"
                onClick={() => {/* TODO: Implement forgot password */}}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {loading ? "Signing in..." : "Sign In"}
            </motion.button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                type="button"
                className="py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm text-gray-700">Google</span>
              </motion.button>

              <motion.button
                type="button"
                className="py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-sm text-gray-700">Facebook</span>
              </motion.button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <a href="/auth/signup" className="text-green-600 hover:underline">
                Sign up
              </a>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

