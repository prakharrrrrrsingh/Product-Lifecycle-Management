import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Cpu, Layers, History } from 'lucide-react'

// Navigation links shown in the mobile bottom bar
const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',   icon: LayoutDashboard, end: true  },
  { to: '/devices',    label: 'Devices',      icon: Cpu,             end: false },
  { to: '/firmware',   label: 'Firmware',     icon: Layers,          end: false },
  { to: '/changelogs', label: 'Logs',         icon: History,         end: false },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#0f0f1a] border-t border-gray-200 dark:border-gray-800/60 flex items-center justify-around z-50 px-2 shadow-lg">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <Icon size={18} className="mb-1" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
