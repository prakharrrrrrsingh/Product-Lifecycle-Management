import { History } from 'lucide-react'
import ChangeLogTable from '../components/ChangeLogTable'

export default function ChangeLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <History size={20} strokeWidth={1.75} className="text-brand-500" />
          Audit Timeline
        </h1>
        <p className="page-subtitle">Full lifecycle audit trail for every device event.</p>
      </div>
      <ChangeLogTable />
    </div>
  )
}
