import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Bell, X, CheckCheck, Zap } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { getChangeLogs } from '../../api/api'

// ──────────────────────────────────────────────────────────────
// Header — top navigation bar rendered across all authenticated pages.
// Contains the theme toggle, a notification bell showing recent
// device activity, and the current user's avatar/initials.
// ──────────────────────────────────────────────────────────────

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

  // Controls whether the notification panel is open
  const [showNotif, setShowNotif] = useState(false)
  // Tracks whether the user has viewed the current notifications
  const [read, setRead] = useState(false)
  // Ref used to detect clicks outside the notification panel
  const panelRef = useRef<HTMLDivElement>(null)

  // Poll for the most recent change logs to populate the notification feed.
  // staleTime of 10 s avoids re-fetching on every render while keeping data fresh.
  const { data: logs = [] } = useQuery({
    queryKey: ['changelogs', {}],
    queryFn: () => getChangeLogs(),
    staleTime: 10_000,
  })

  // Show only the 6 most recent events in the notification panel
  const recent = logs.slice(0, 6)
  // The bell badge is visible while there are unread notifications
  const hasUnread = !read && recent.length > 0

  // Close the notification panel when the user clicks outside it
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    if (showNotif) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showNotif])

  // Generate up to two initials from the user's full name, or fall back to
  // the first character of their email address
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'U').toUpperCase()

  /**
   * Converts a raw action string (e.g. "FIRMWARE_UPGRADED: 1.0.0 → 2.0.0")
   * into a human-readable headline (e.g. "Firmware Upgraded").
   * Only keeps the part before the first colon.
   */
  function formatAction(action: string) {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .split(':')[0]
      .trim()
  }

  /**
   * Returns a compact relative time string for a given ISO timestamp
   * (e.g. "just now", "5m ago", "2h ago", "3d ago").
   */
  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <header className="h-[60px] flex items-center justify-end px-4 md:px-6 bg-white dark:bg-[#0f0f1a] border-b border-gray-200 dark:border-gray-800/60 flex-shrink-0 gap-4">

      {/* Mobile Brand Logo */}
      <div className="flex md:hidden items-center gap-2 mr-auto">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-brand flex-shrink-0">
          <Zap size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">DeviceCycle</span>
      </div>

      <div className="flex items-center gap-1">

        {/* ── Theme toggle ── */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {/* Swap icon based on current theme */}
          {theme === 'dark'
            ? <Sun size={16} strokeWidth={1.75} />
            : <Moon size={16} strokeWidth={1.75} />
          }
        </button>

        {/* ── Notification bell + panel ── */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => { setShowNotif(v => !v); setRead(true) }}
            className="btn-icon relative"
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={1.75} />
            {/* Unread indicator dot — hidden after opening the panel */}
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
            )}
          </button>

          {/* Notification dropdown panel */}
          {showNotif && (
            <div className="absolute right-0 top-11 w-80 card shadow-xl z-50 animate-fade-in overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Recent device activity</p>
                </div>
                <button onClick={() => setShowNotif(false)} className="btn-icon w-6 h-6">
                  <X size={13} />
                </button>
              </div>

              {/* Empty state when there are no recent events */}
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CheckCheck size={24} className="text-gray-300 dark:text-gray-700" />
                  <p className="text-sm text-gray-400 dark:text-gray-600">All caught up!</p>
                </div>
              ) : (
                /* Scrollable list of recent change-log entries */
                <div className="max-h-72 overflow-y-auto">
                  {recent.map(log => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 dark:text-gray-200 truncate">
                          {formatAction(log.action)}
                        </p>
                        {/* Serial number shown in monospace for quick scanning */}
                        <p className="text-[11px] text-gray-400 dark:text-gray-600 font-mono truncate">{log.serialNumber}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0 pt-0.5">{timeAgo(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Visual separator between the action buttons and the avatar */}
        <span className="w-px h-5 bg-gray-200 dark:bg-gray-700/60 mx-1.5" />

        {/* ── User avatar ── */}
        {/* Gradient circle showing the user's initials — no click action */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold select-none cursor-default shadow-sm">
          {initials}
        </div>
      </div>
    </header>
  )
}
