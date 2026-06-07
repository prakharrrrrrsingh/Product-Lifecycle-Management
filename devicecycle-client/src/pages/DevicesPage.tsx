import { Cpu } from 'lucide-react'
import DeviceGrid from '../components/DeviceGrid'

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <Cpu size={20} strokeWidth={1.75} className="text-brand-500" />
          Device Fleet
        </h1>
        <p className="page-subtitle">Manage, monitor and update all registered devices.</p>
      </div>
      <DeviceGrid />
    </div>
  )
}
