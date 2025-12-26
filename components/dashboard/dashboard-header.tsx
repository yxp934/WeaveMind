import { Button } from "@/components/ui/button"
import { Bell, Search, User } from "lucide-react"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  userEmail?: string
  userName?: string
  userOrganization?: string
  userAvatar?: string
}

export function DashboardHeader({
  title,
  subtitle,
  userEmail,
  userName,
  userOrganization,
  userAvatar,
}: DashboardHeaderProps) {
  const primaryLabel = userName || userEmail || "User"
  const secondaryLabel = userOrganization || (userName ? userEmail : undefined)

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-8">
        {/* Search Bar */}
        <div className="flex flex-1 items-center max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{primaryLabel}</p>
              {secondaryLabel && (
                <p className="text-xs text-gray-500">{secondaryLabel}</p>
              )}
            </div>
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={primaryLabel}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
            )}
          </div>

          <form action="/auth/signout" method="post">
            <Button variant="ghost" type="submit" size="sm">
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      {/* Page Title */}
      {title && (
        <div className="px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
