import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "../components/Sidebar"

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/keys': 'API Keys',
  '/providers': 'Providers',
  '/chat': 'Chat Playground',
  '/logs': 'Request Logs',
  '/settings': 'Settings',
  '/docs': 'Documentation',
}

export function MainLayout() {
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? ''

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex overflow-hidden">
      {/* Abstract Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[50%] rounded-full bg-emerald-900/10 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-8 border-b border-gray-800/30 bg-gray-900/20 backdrop-blur-sm z-10">
          <h2 className="text-base font-semibold text-gray-200">{pageTitle}</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Online</span>
            </div>
            <span className="text-xs text-gray-600">v1.0.0</span>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
