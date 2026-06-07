import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFirmwareVersions, addFirmwareVersion, FirmwareVersionDto } from '../api/api'
import { sortBySemVer, compareSemVer, getVersionBumpType } from '../utils/semver'
import { useAuth } from '../context/AuthContext'
import { Plus, Layers, AlertTriangle, Star, X, Loader2, AlertCircle, Tag } from 'lucide-react'

function BumpBadge({ type }: { type: 'major' | 'minor' | 'patch' | 'latest' }) {
  const styles = {
    major:  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800/50',
    minor:  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50',
    patch:  'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50',
    latest: 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50',
  }
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${styles[type]}`}>
      {type}
    </span>
  )
}

function AddFirmwareModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [version, setVersion] = useState('')
  const [notes, setNotes]     = useState('')
  const [vErr, setVErr]       = useState('')
  const [apiError, setApiError] = useState('')

  const mutation = useMutation({
    mutationFn: () => addFirmwareVersion({ version: version.trim(), notes: notes.trim() || undefined }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['firmware'] }); onClose() },
    onError:    (e: Error) => setApiError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!version.trim()) { setVErr('Version is required'); return }
    const semverRe = /^\d+\.\d+\.\d+$/
    if (!semverRe.test(version.trim())) { setVErr('Must follow SemVer format: major.minor.patch'); return }
    setVErr('')
    mutation.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Publish Firmware</h2>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Add a new version to the catalog</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="form-label">Version * <span className="text-gray-400 font-normal">(SemVer: major.minor.patch)</span></label>
            <input
              autoFocus
              type="text"
              value={version}
              onChange={e => { setVersion(e.target.value); setVErr('') }}
              placeholder="e.g. 3.1.0"
              className={`input font-mono ${vErr ? 'input-error' : ''}`}
            />
            {vErr && (
              <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle size={11} />{vErr}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="form-label">Release Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe changes, bug fixes, security patches…"
              rows={3}
              className="input resize-none"
            />
          </div>

          {apiError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{apiError}</p>
            </div>
          )}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            {mutation.isPending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FirmwareCard({
  fw,
  isLatest,
  prevVersion,
  rank,
}: {
  fw: FirmwareVersionDto
  isLatest: boolean
  prevVersion: string | null
  rank: number
}) {
  const bumpType = prevVersion ? getVersionBumpType(prevVersion, fw.version) : null

  return (
    <div className={`card-hover p-4 animate-fade-in ${isLatest ? 'ring-1 ring-brand-500/30 dark:ring-brand-400/20' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isLatest
              ? 'bg-brand-50 dark:bg-brand-950/40'
              : 'bg-gray-100 dark:bg-gray-800/60'
          }`}>
            {isLatest
              ? <Star size={15} className="text-brand-600 dark:text-brand-400" strokeWidth={1.75} />
              : <Tag  size={15} className="text-gray-500 dark:text-gray-500"   strokeWidth={1.75} />
            }
          </div>
          <div>
            <p className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
              v{fw.version}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600">ID #{fw.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isLatest && <BumpBadge type="latest" />}
          {bumpType && bumpType !== 'same' && <BumpBadge type={bumpType} />}
        </div>
      </div>

      {fw.notes ? (
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
          {fw.notes}
        </p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-600 italic">No release notes</p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-gray-600">
          {isLatest ? 'Latest stable' : `${rank} version${rank !== 1 ? 's' : ''} behind`}
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(rank, 5) }).map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${
              i === 0 ? 'bg-brand-400 dark:bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FirmwareCatalog() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'Admin'
  const [showAdd, setShowAdd] = useState(false)

  const { data: raw = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['firmware'],
    queryFn:  getFirmwareVersions,
  })

  const versions = sortBySemVer(raw, f => f.version, true)
  const latestVersion = versions[0]?.version ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Layers size={15} strokeWidth={1.75} />
          <span>{versions.length} version{versions.length !== 1 ? 's' : ''} in catalog</span>
          {latestVersion && (
            <>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">latest: v{latestVersion}</span>
            </>
          )}
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary py-2">
            <Plus size={13} />
            Publish Version
          </button>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-3">
              <div className="flex gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-full" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="card p-12 text-center">
          <AlertTriangle size={30} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Failed to load firmware catalog.</p>
          <button onClick={() => refetch()} className="btn-secondary mx-auto">Retry</button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {versions.length === 0 ? (
            <div className="card p-16 text-center">
              <Layers size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" strokeWidth={1} />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No firmware versions yet</p>
              {isAdmin && (
                <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto">
                  <Plus size={13} /> Publish first version
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {versions.map((fw, i) => (
                <FirmwareCard
                  key={fw.id}
                  fw={fw}
                  isLatest={fw.version === latestVersion}
                  prevVersion={versions[i + 1]?.version ?? null}
                  rank={i}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showAdd && <AddFirmwareModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
