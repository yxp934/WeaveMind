"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Building2,
  Users,
  BookOpen,
  BarChart3,
  FileText,
  Calendar,
  Settings,
  GraduationCap,
  MessageSquare,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap = {
  Home,
  Building2,
  Users,
  BookOpen,
  BarChart3,
  FileText,
  Calendar,
  Settings,
  GraduationCap,
  MessageSquare,
  User,
}

type IconName = keyof typeof iconMap

interface NavItem {
  title: string
  href: string
  icon: IconName
}

interface DashboardSidebarProps {
  navItems: NavItem[]
  logo?: string
  logoText?: string
}

export function DashboardSidebar({
  navItems,
  logo,
  logoText = "WeaveMind",
}: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-2xl font-bold text-indigo-600">{logoText}</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = iconMap[item.icon]

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

