import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, KeyRound, Activity, Settings, Blocks, MessageSquare, BookOpen } from "lucide-react"
import { cn } from "../lib/utils"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Bridge", href: "/keys", icon: KeyRound },
  { name: "Providers", href: "/providers", icon: Blocks },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Logs", href: "/logs", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Docs", href: "/docs", icon: BookOpen },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 h-screen hidden md:flex flex-col bg-gray-900/40 backdrop-blur-xl border-r border-gray-800/60">
      {/* Logo */}
      <div className="h-16 shrink-0 flex items-center px-6 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">Proxy.MAD</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                isActive
                  ? "bg-emerald-500/10 text-white border border-emerald-500/20 shadow-sm"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/40 border border-transparent"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                isActive ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800/30 border border-gray-700/30">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-400">Proxy Active</span>
        </div>
      </div>
    </aside>
  )
}
