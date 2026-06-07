import { useQuery } from '@tanstack/react-query'
import { getDevices, getFirmwareVersions, getChangeLogs, getOutdatedDevices } from '../api/api'
import { useAuth } from '../context/AuthContext'
import FirmwareChart from '../components/charts/FirmwareChart'
import {
  Cpu, Layers, AlertTriangle, Activity,
  TrendingUp, Zap, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { sortBySemVer } from '../utils/semver'

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  bgClass,
  sub,
  to,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  iconClass: string
  bgClass: string
  sub?: string
  to?: string
}) {
  const inner = (
    <div className={`card-hover p-5 group ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass}`}>
          <Icon size={18} className={iconClass} strokeWidth={1.75} />
        </div>
        {to && (
          <ArrowRight size={14} className="text-gray-300 dark:text-gray-700 group-hover:text-brand-500 transition-colors mt-1" />
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>
}

function RecentEntry({ action, serial, ts }: { action: string; serial: string; ts: string }) {
  const date = new Date(ts)
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const clean = action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .split(':')[0]

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
      <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
          {clean} — <span className="font-mono text-brand-600 dark:text-brand-400">{serial}</span>
        </p>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0">{time}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: devices  = [] } = useQuery({ queryKey: ['devices'],  queryFn: () => getDevices()          })
  const { data: firmware = [] } = useQuery({ queryKey: ['firmware'], queryFn: getFirmwareVersions          })
  const { data: logs     = [] } = useQuery({ queryKey: ['changelogs', {}], queryFn: () => getChangeLogs() })
  const { data: outdated = [] } = useQuery({ queryKey: ['outdated'], queryFn: getOutdatedDevices, retry: false })

  const activeCount = devices.filter(d => d.status.toLowerCase() === 'active').length
  const sortedFw    = sortBySemVer(firmware, f => f.version)
  const latestFw    = sortedFw[0]?.version ?? '—'

  const statusGroups: Record<string, number> = {}
  for (const d of devices) {
    const s = d.status.toLowerCase()
    statusGroups[s] = (statusGroups[s] ?? 0) + 1
  }
  const chartData = Object.entries(statusGroups).map(([status, count]) => ({ status, count }))

  const recentLogs = logs.slice(0, 8)

  const firstName = user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Good day, {firstName} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Here's what's happening with your device fleet.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Devices"
          value={devices.length}
          icon={Cpu}
          iconClass="text-brand-600 dark:text-brand-400"
          bgClass="bg-brand-50 dark:bg-brand-950/40"
          sub={`${activeCount} active`}
          to="/devices"
        />
        <StatCard
          label="Active Devices"
          value={activeCount}
          icon={Activity}
          iconClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-50 dark:bg-emerald-950/40"
          sub={devices.length ? `${Math.round((activeCount / devices.length) * 100)}% of fleet` : undefined}
          to="/devices"
        />
        <StatCard
          label="Firmware Versions"
          value={firmware.length}
          icon={Layers}
          iconClass="text-sky-600 dark:text-sky-400"
          bgClass="bg-sky-50 dark:bg-sky-950/40"
          sub={firmware.length ? `Latest: v${latestFw}` : undefined}
          to="/firmware"
        />
        <StatCard
          label="Outdated Devices"
          value={outdated.length}
          icon={AlertTriangle}
          iconClass={outdated.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-600'}
          bgClass={outdated.length > 0 ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-gray-100 dark:bg-gray-800/40'}
          sub={outdated.length > 0 ? 'Need firmware update' : 'All up to date'}
          to="/devices?filter=outdated"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fleet Status Breakdown</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Device count by lifecycle status</p>
            </div>
            <TrendingUp size={16} className="text-brand-500" />
          </div>
          {chartData.length > 0
            ? <FirmwareChart data={chartData} />
            : (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-gray-600">No data yet</p>
              </div>
            )
          }
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Latest lifecycle events</p>
            </div>
            <Zap size={15} className="text-brand-500" />
          </div>
          {recentLogs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-sm text-gray-400 dark:text-gray-600">No recent events</p>
            </div>
          ) : (
            <div>
              {recentLogs.map(l => (
                <RecentEntry key={l.id} action={l.action} serial={l.serialNumber} ts={l.createdAt} />
              ))}
              <Link
                to="/changelogs"
                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline mt-3"
              >
                View full audit trail <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {outdated.length > 0 && (
        <div className="card p-4 border-amber-300 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/10 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle size={17} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {outdated.length} device{outdated.length !== 1 ? 's' : ''} running outdated firmware
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                Current latest is v{latestFw}. Visit the Devices page to update them.
              </p>
            </div>
            <Link to="/devices?filter=outdated" className="text-xs text-amber-700 dark:text-amber-300 font-medium hover:underline flex-shrink-0">
              View →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
