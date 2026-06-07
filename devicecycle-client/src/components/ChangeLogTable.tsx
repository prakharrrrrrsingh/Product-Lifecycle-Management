import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getChangeLogs, ChangeLogEntryWithDeviceDto, ChangeLogFilters } from '../api/api'
import {
  History, AlertTriangle, Search,
  Cpu, GitBranch, Activity, Plus, Pencil, Trash2, RefreshCw,
  ChevronDown,
} from 'lucide-react'

function getActionMeta(action: string) {
  const a = action.toUpperCase()
  if (a.startsWith('CREATED'))          return { icon: Plus,      color: 'emerald', label: 'Created' }
  if (a.startsWith('FIRMWARE_UPGRADE')) return { icon: GitBranch, color: 'brand',   label: 'Firmware Upgraded' }
  if (a.startsWith('STATUS_CHANGED'))   return { icon: Activity,  color: 'amber',   label: 'Status Changed' }
  if (a.startsWith('MODEL_CHANGED'))    return { icon: Cpu,       color: 'sky',     label: 'Model Changed' }
  if (a.startsWith('SERIAL_CHANGED'))   return { icon: Pencil,    color: 'violet',  label: 'Serial Changed' }
  if (a.startsWith('DELETED'))          return { icon: Trash2,    color: 'red',     label: 'Deleted' }
  return { icon: RefreshCw, color: 'gray', label: 'Updated' }
}

const COLOR_MAP: Record<string, { dot: string; icon: string; ring: string }> = {
  emerald: { dot: 'bg-emerald-500', icon: 'text-emerald-600 dark:text-emerald-400',  ring: 'ring-emerald-200 dark:ring-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30' },
  brand:   { dot: 'bg-brand-500',   icon: 'text-brand-600 dark:text-brand-400',      ring: 'ring-brand-200 dark:ring-brand-800/60 bg-brand-50 dark:bg-brand-950/30' },
  amber:   { dot: 'bg-amber-500',   icon: 'text-amber-600 dark:text-amber-400',      ring: 'ring-amber-200 dark:ring-amber-800/60 bg-amber-50 dark:bg-amber-950/30' },
  sky:     { dot: 'bg-sky-500',     icon: 'text-sky-600 dark:text-sky-400',          ring: 'ring-sky-200 dark:ring-sky-800/60 bg-sky-50 dark:bg-sky-950/30' },
  violet:  { dot: 'bg-violet-500',  icon: 'text-violet-600 dark:text-violet-400',    ring: 'ring-violet-200 dark:ring-violet-800/60 bg-violet-50 dark:bg-violet-950/30' },
  red:     { dot: 'bg-red-500',     icon: 'text-red-600 dark:text-red-400',          ring: 'ring-red-200 dark:ring-red-800/60 bg-red-50 dark:bg-red-950/30' },
  gray:    { dot: 'bg-gray-400',    icon: 'text-gray-500 dark:text-gray-400',        ring: 'ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800/40' },
}

function parseActionDetail(action: string): { headline: string; detail: string | null } {
  const arrow = action.includes('→') ? '→' : (action.includes('->') ? '->' : null)
  if (arrow) {
    const parts  = action.split(':')
    const prefix = (parts[0] ?? action).trim()
    const rest   = parts.slice(1).join(':').trim()
    return { headline: formatKey(prefix), detail: rest || null }
  }
  return { headline: formatKey(action), detail: null }
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function TimelineEntry({
  entry,
  isLast,
}: {
  entry: ChangeLogEntryWithDeviceDto
  isLast: boolean
}) {
  const { icon: Icon, color, label } = getActionMeta(entry.action)
  const { dot, icon: iconCls, ring } = COLOR_MAP[color]
  const { headline, detail }          = parseActionDetail(entry.action)

  const ts = new Date(entry.createdAt)
  const formattedDate = ts.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  const formattedTime = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <div className="relative flex gap-4 pb-6 animate-fade-in">
      {!isLast && <div className="timeline-line" />}

      <div className={`relative flex-shrink-0 w-10 h-10 rounded-full ring-2 ${ring} flex items-center justify-center z-10`}>
        <Icon size={14} className={iconCls} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0 pt-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{headline}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-600">·</span>
          <span className="text-xs font-mono text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-1.5 py-0.5 rounded">
            {entry.serialNumber}
          </span>
        </div>

        {detail && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700/50 mb-1.5 inline-block">
            {detail}
          </p>
        )}

        <p className="text-[11px] text-gray-400 dark:text-gray-600">
          {formattedDate} at {formattedTime}
        </p>
      </div>
    </div>
  )
}

function DayHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
    </div>
  )
}

const ACTION_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Created',  value: 'CREATED' },
  { label: 'Firmware', value: 'FIRMWARE' },
  { label: 'Status',   value: 'STATUS' },
  { label: 'Updated',  value: 'UPDATED' },
]

export default function ChangeLogTable() {
  const [search, setSearch]       = useState('')
  const [actionFilter, setAction] = useState('')

  const filters: ChangeLogFilters = {}
  if (actionFilter) filters.action = actionFilter

  const { data: logs = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['changelogs', filters],
    queryFn:  () => getChangeLogs(filters),
  })

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.serialNumber.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q)
    )
  })

  const grouped = groupByDay(filtered)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs…"
            className="input pl-8 w-52 py-2"
          />
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
          {ACTION_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setAction(f.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                actionFilter === f.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button onClick={() => refetch()} disabled={isFetching} className="ml-auto btn-secondary py-2">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isLoading && (
        <div className="card p-6 space-y-6 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-2">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-2/5" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="card p-12 text-center">
          <AlertTriangle size={30} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Failed to load change logs.</p>
          <button onClick={() => refetch()} className="btn-secondary mx-auto">Retry</button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {filtered.length === 0 ? (
            <div className="card p-16 text-center">
              <History size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" strokeWidth={1} />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No change logs found</p>
            </div>
          ) : (
            <div className="card p-6">
              {grouped.map(({ dayLabel, entries }) => (
                <div key={dayLabel}>
                  <DayHeader label={dayLabel} />
                  <div className="ml-2">
                    {entries.map((entry, i) => (
                      <TimelineEntry
                        key={entry.id}
                        entry={entry}
                        isLast={i === entries.length - 1 && dayLabel === grouped[grouped.length - 1].dayLabel}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-600">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}

function groupByDay(entries: ChangeLogEntryWithDeviceDto[]): { dayLabel: string; entries: ChangeLogEntryWithDeviceDto[] }[] {
  const map = new Map<string, ChangeLogEntryWithDeviceDto[]>()

  for (const e of entries) {
    const d    = new Date(e.createdAt)
    const now  = new Date()
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (isSameDay(d, now)) label = 'Today'
    else if (isSameDay(d, yesterday)) label = 'Yesterday'
    else label = d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(e)
  }

  return Array.from(map.entries()).map(([dayLabel, entries]) => ({ dayLabel, entries }))
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth() &&
    a.getDate()     === b.getDate()
}

