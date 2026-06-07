import { Layers } from 'lucide-react'
import FirmwareCatalog from '../components/FirmwareCatalog'

export default function FirmwarePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <Layers size={20} strokeWidth={1.75} className="text-brand-500" />
          Firmware Catalog
        </h1>
        <p className="page-subtitle">Publish and track firmware versions across the fleet.</p>
      </div>
      <FirmwareCatalog />
    </div>
  )
}
