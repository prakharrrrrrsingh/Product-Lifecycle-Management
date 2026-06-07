import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getDevices, deleteDevice, getOutdatedDevices, DeviceDto } from '../api/api'
import { useAuth } from '../context/AuthContext'
import {
  Cpu, Plus, Pencil, Trash2, RefreshCw,
  Search, AlertTriangle,
} from 'lucide-react'
import DeviceForm from './DeviceForm'

// ──────────────────────────────────────────────────────────────
// DeviceGrid — main device listing page component.
// Renders search/filter controls, a responsive card grid of
// devices, and hosts the DeviceForm modal and delete confirmation
// dialog. Admin users see edit/delete controls; regular users
// have read-only access.
// ──────────────────────────────────────────────────────────────

// ── Sub-components ────────────────────────────────────────────

/**
 * Renders a colour-coded pill badge for a device's lifecycle status.
 * Statuses not explicitly handled fall back to the "Inactive" style.
 */
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  if (s === 'active')
    return (
      <span className="badge-active">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
        Active
      </span>
    )
  if (s === 'retired')        return <span className="badge-retired"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Retired</span>
  if (s === 'decommissioned') return <span className="badge-decommissioned"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Decommissioned</span>
  return <span className="badge-inactive"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Inactive</span>
}

/**
 * Animated placeholder card shown while device data is loading.
 * Matches the rough shape of a real DeviceCard to avoid layout shift.
 */
function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-1/2" />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
        <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-2/5" />
    </div>
  )
}

/**
 * A single device card showing serial number, model, status badge,
 * firmware version, last-updated time, and (for admins) edit/delete buttons.
 * The edit/delete buttons are hidden until the card is hovered.
 */
function DeviceCard({
  device,
  isAdmin,
  onEdit,
  onDelete,
}: {
  device: DeviceDto
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const ago = timeAgo(new Date(device.updatedAt))

  return (
    <div className="card-hover p-4 group animate-fade-in">
      {/* ── Card header: icon, serial number, model ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
            <Cpu size={15} className="text-brand-600 dark:text-brand-400" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono truncate">
              {device.serialNumber}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
              {device.model ?? <span className="italic">Unknown model</span>}
            </p>
          </div>
        </div>

        {/* Admin action buttons — revealed on hover via group-hover */}
        {isAdmin && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
              title="Edit"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Status badge + firmware version ── */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={device.status} />
        {device.firmwareVersion ? (
          <span className="text-[11px] font-mono text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800/50">
            v{device.firmwareVersion}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 dark:text-gray-600 italic">No firmware</span>
        )}
      </div>

      {/* Relative time of last update */}
      <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2.5">
        Updated {ago}
      </p>
    </div>
  )
}

/**
 * Confirmation modal displayed before permanently deleting a device.
 * Disables the confirm button while the delete mutation is in flight.
 */
function DeleteModal({
  deviceId,
  onCancel,
  onConfirm,
  isPending,
}: {
  deviceId: number
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm p-6 animate-slide-up">
        <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={19} className="text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center">Delete Device #{deviceId}?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 mb-6 leading-relaxed">
          This will permanently remove the device and all its change logs. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-danger flex-1 justify-center"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Available status filter values — empty string means "All"
const STATUS_FILTERS = ['', 'active', 'inactive', 'retired', 'decommissioned'] as const

// ── Main component ────────────────────────────────────────────

export default function DeviceGrid() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'Admin'
  const [searchParams, setSearchParams] = useSearchParams()
  // Detect when the page was linked to with ?filter=outdated (from the dashboard)
  const isOutdatedFilter = searchParams.get('filter') === 'outdated'

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<DeviceDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  // When the user picks a status tab, clear the URL "outdated" filter
  useEffect(() => {
    if (statusFilter) setSearchParams({})
  }, [statusFilter])

  // ── Data fetching ──────────────────────────────────────────
  const { data: devices = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['devices', statusFilter],
    queryFn:  () => getDevices(statusFilter || undefined),
  })

  // Fetch outdated list only when the ?filter=outdated param is present
  const { data: outdatedList = [] } = useQuery({
    queryKey: ['outdated'],
    queryFn:  getOutdatedDevices,
    enabled:  isOutdatedFilter,
    retry:    false,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess:  () => {
      // Invalidate the device list so the grid refreshes without the deleted card
      qc.invalidateQueries({ queryKey: ['devices'] })
      setDeleteTarget(null)
    },
  })

  // ── Filtering logic ────────────────────────────────────────

  // When the outdated filter is active, limit the grid to only those device IDs
  const outdatedIds = new Set(outdatedList.map(o => o.id))
  const baseDevices = isOutdatedFilter && outdatedList.length > 0
    ? devices.filter(d => outdatedIds.has(d.id))
    : devices

  // Apply the search box filter across serial number, model, and firmware
  const filtered = baseDevices.filter(d => {
    const q = search.toLowerCase()
    return (
      d.serialNumber.toLowerCase().includes(q) ||
      (d.model ?? '').toLowerCase().includes(q) ||
      (d.firmwareVersion ?? '').toLowerCase().includes(q)
    )
  })

  // ── Event handlers ────────────────────────────────────────
  const handleEditDevice = (d: DeviceDto) => { setEditing(d); setShowForm(true) }
  const handleCloseForm  = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-4">
      {/* ── Outdated firmware banner ── */}
      {isOutdatedFilter && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 animate-fade-in">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Showing devices with outdated firmware
          </p>
          <button
            onClick={() => setSearchParams({})}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── Search + filter toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Text search input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search devices…"
            className="input pl-8 w-52 py-2"
          />
        </div>

        {/* Status filter pill buttons */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg p-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all duration-150 ${
                statusFilter === s
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Refresh and Add Device buttons (right-aligned) */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['changelogs'] }) }} disabled={isFetching} className="btn-secondary py-2">
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="btn-primary py-2">
              <Plus size={13} />
              Add Device
            </button>
          )}
        </div>
      </div>

      {/* ── Loading state: skeleton cards ── */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Error state ── */}
      {isError && (
        <div className="card p-12 text-center">
          <AlertTriangle size={30} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Failed to load devices.</p>
          <button onClick={() => refetch()} className="btn-secondary mx-auto">Retry</button>
        </div>
      )}

      {/* ── Loaded state: device cards or empty message ── */}
      {!isLoading && !isError && (
        <>
          {filtered.length === 0 ? (
            <div className="card p-16 text-center">
              <Cpu size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" strokeWidth={1} />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No devices found</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Adjust filters or add a new device</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(d => (
                <DeviceCard
                  key={d.id}
                  device={d}
                  isAdmin={isAdmin}
                  onEdit={() => handleEditDevice(d)}
                  onDelete={() => setDeleteTarget(d.id)}
                />
              ))}
            </div>
          )}
          {/* Result count footer */}
          <p className="text-xs text-gray-400 dark:text-gray-600">
            {filtered.length} of {devices.length} device{devices.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* ── Add / Edit device modal ── */}
      {showForm && (
        <DeviceForm device={editing} onClose={handleCloseForm} onSuccess={handleCloseForm} />
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget !== null && (
        <DeleteModal
          deviceId={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

// ── Utilities ─────────────────────────────────────────────────

/**
 * Returns a compact human-readable string describing how long ago
 * the given Date occurred (e.g. "just now", "3m ago", "2h ago", "5d ago").
 */
function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
