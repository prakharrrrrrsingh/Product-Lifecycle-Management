import type {
  DeviceDto, FirmwareVersionDto,
  ChangeLogEntryWithDeviceDto, OutdatedDeviceDto,
} from '../api/api'

export const MOCK_DEVICES: DeviceDto[] = [
  { id: 1,  serialNumber: 'SN-001-ALPHA', model: 'ThinkPad X1',    status: 'active',         firmwareVersion: '3.1.0', createdAt: '2025-01-10T08:00:00Z', updatedAt: '2026-04-10T14:22:00Z' },
  { id: 2,  serialNumber: 'SN-002-BETA',  model: 'Dell XPS 15',    status: 'active',         firmwareVersion: '3.1.0', createdAt: '2025-02-14T09:15:00Z', updatedAt: '2026-04-11T09:05:00Z' },
  { id: 3,  serialNumber: 'SN-003-GAMMA', model: 'MacBook Pro M3', status: 'active',         firmwareVersion: '2.4.1', createdAt: '2025-03-01T11:00:00Z', updatedAt: '2026-04-09T16:30:00Z' },
  { id: 4,  serialNumber: 'SN-004-DELTA', model: 'HP EliteBook',   status: 'inactive',       firmwareVersion: '2.4.1', createdAt: '2025-01-20T10:00:00Z', updatedAt: '2026-03-28T11:00:00Z' },
  { id: 5,  serialNumber: 'SN-005-ECHO',  model: 'Lenovo T14',     status: 'active',         firmwareVersion: '3.1.0', createdAt: '2025-04-05T13:45:00Z', updatedAt: '2026-04-12T08:00:00Z' },
  { id: 6,  serialNumber: 'SN-006-FOXT',  model: 'Surface Pro 9',  status: 'retired',        firmwareVersion: '1.9.2', createdAt: '2024-11-01T08:00:00Z', updatedAt: '2026-02-15T10:00:00Z' },
  { id: 7,  serialNumber: 'SN-007-GOLF',  model: 'ASUS ZenBook',   status: 'active',         firmwareVersion: '3.0.0', createdAt: '2025-05-10T07:30:00Z', updatedAt: '2026-04-08T15:10:00Z' },
  { id: 8,  serialNumber: 'SN-008-HOTEL', model: 'Razer Blade 16', status: 'decommissioned', firmwareVersion: '1.5.0', createdAt: '2024-06-20T09:00:00Z', updatedAt: '2026-01-05T12:00:00Z' },
  { id: 9,  serialNumber: 'SN-009-INDIA', model: 'ThinkPad T16',   status: 'active',         firmwareVersion: '3.1.0', createdAt: '2025-06-15T10:00:00Z', updatedAt: '2026-04-13T06:45:00Z' },
  { id: 10, serialNumber: 'SN-010-JULIET',model: 'Dell Latitude',  status: 'inactive',       firmwareVersion: null,    createdAt: '2025-07-01T08:00:00Z', updatedAt: '2026-03-20T14:00:00Z' },
  { id: 11, serialNumber: 'SN-011-KILO',  model: 'HP Spectre',     status: 'active',         firmwareVersion: '2.4.1', createdAt: '2025-08-10T11:00:00Z', updatedAt: '2026-04-11T13:00:00Z' },
  { id: 12, serialNumber: 'SN-012-LIMA',  model: 'Acer Swift',     status: 'retired',        firmwareVersion: '2.0.0', createdAt: '2024-09-05T09:30:00Z', updatedAt: '2026-03-01T10:00:00Z' },
]

export const MOCK_FIRMWARE: FirmwareVersionDto[] = [
  { id: 5, version: '3.1.0', notes: 'Critical security patch for CVE-2026-1234. Recommended for all devices immediately.' },
  { id: 4, version: '3.0.0', notes: 'Major release: new hardware abstraction layer, improved power management, and USB-C firmware negotiation.' },
  { id: 3, version: '2.4.1', notes: 'Hotfix: resolved memory leak in network driver introduced in 2.4.0.' },
  { id: 2, version: '2.4.0', notes: 'Added support for WPA3 enterprise networks and improved Bluetooth stack stability.' },
  { id: 1, version: '1.9.2', notes: 'Legacy maintenance release. EOL scheduled for Q3 2026.' },
]

export const MOCK_CHANGELOGS: ChangeLogEntryWithDeviceDto[] = [
  { id: 101, deviceId: 9,  serialNumber: 'SN-009-INDIA', action: 'FIRMWARE_UPGRADED: 3.0.0 → 3.1.0', createdAt: '2026-04-13T06:45:00Z' },
  { id: 100, deviceId: 5,  serialNumber: 'SN-005-ECHO',  action: 'FIRMWARE_UPGRADED: 2.4.1 → 3.1.0', createdAt: '2026-04-12T08:00:00Z' },
  { id: 99,  deviceId: 2,  serialNumber: 'SN-002-BETA',  action: 'STATUS_CHANGED: inactive → active',  createdAt: '2026-04-11T09:05:00Z' },
  { id: 98,  deviceId: 11, serialNumber: 'SN-011-KILO',  action: 'MODEL_CHANGED: (none) → HP Spectre', createdAt: '2026-04-11T13:00:00Z' },
  { id: 97,  deviceId: 1,  serialNumber: 'SN-001-ALPHA', action: 'FIRMWARE_UPGRADED: 2.4.1 → 3.1.0',  createdAt: '2026-04-10T14:22:00Z' },
  { id: 96,  deviceId: 3,  serialNumber: 'SN-003-GAMMA', action: 'STATUS_CHANGED: active → active',    createdAt: '2026-04-09T16:30:00Z' },
  { id: 95,  deviceId: 7,  serialNumber: 'SN-007-GOLF',  action: 'FIRMWARE_UPGRADED: 2.4.0 → 3.0.0',  createdAt: '2026-04-08T15:10:00Z' },
  { id: 94,  deviceId: 4,  serialNumber: 'SN-004-DELTA', action: 'STATUS_CHANGED: active → inactive',  createdAt: '2026-03-28T11:00:00Z' },
  { id: 93,  deviceId: 12, serialNumber: 'SN-012-LIMA',  action: 'STATUS_CHANGED: active → retired',   createdAt: '2026-03-01T10:00:00Z' },
  { id: 92,  deviceId: 10, serialNumber: 'SN-010-JULIET',action: 'UPDATED',                            createdAt: '2026-03-20T14:00:00Z' },
  { id: 91,  deviceId: 6,  serialNumber: 'SN-006-FOXT',  action: 'STATUS_CHANGED: active → retired',   createdAt: '2026-02-15T10:00:00Z' },
  { id: 90,  deviceId: 8,  serialNumber: 'SN-008-HOTEL', action: 'STATUS_CHANGED: retired → decommissioned', createdAt: '2026-01-05T12:00:00Z' },
  { id: 1,   deviceId: 1,  serialNumber: 'SN-001-ALPHA', action: 'CREATED', createdAt: '2025-01-10T08:00:00Z' },
]

export const MOCK_OUTDATED: OutdatedDeviceDto[] = MOCK_DEVICES
  .filter(d => d.firmwareVersion && d.firmwareVersion !== '3.1.0')
  .map(d => ({
    id: d.id,
    serialNumber: d.serialNumber,
    model: d.model,
    status: d.status,
    currentFirmware: d.firmwareVersion!,
    latestFirmware: '3.1.0',
    updatedAt: d.updatedAt,
  }))
