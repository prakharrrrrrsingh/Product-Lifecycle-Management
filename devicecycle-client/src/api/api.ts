import {
  MOCK_DEVICES, MOCK_FIRMWARE, MOCK_CHANGELOGS, MOCK_OUTDATED,
} from '../mocks/mockData'

// ──────────────────────────────────────────────────────────────
// api.ts — thin wrapper around the DeviceCycle REST API.
//
// Strategy: every exported function first tries the real backend.
// If the server is unreachable (network error or 5xx proxy error)
// a MockFallbackError is thrown internally and the function falls
// back to in-memory mock data so the UI still works offline or
// during development without a running backend.
// ──────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// ── Helpers ───────────────────────────────────────────────────

/** Retrieves the JWT from localStorage, or null if not logged in. */
function getToken(): string | null {
  return localStorage.getItem('dc-token')
}

/**
 * Returns true when the error is a browser-level network failure
 * (e.g. server not running, DNS failure).
 * These should trigger the mock fallback rather than surfacing as user errors.
 */
function isConnectionError(e: unknown): boolean {
  if (!(e instanceof TypeError)) return false
  const msg = (e as TypeError).message.toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')
}

/**
 * Returns true when the response looks like a proxy/gateway error
 * with no useful body — e.g. a Vite dev proxy failing to reach the backend.
 */
function isProxyError(status: number, body: unknown): boolean {
  return (status === 500 || status === 502 || status === 503 || status === 504) && body === null
}

// ── Core fetch wrapper ────────────────────────────────────────

/**
 * Sends an authenticated fetch request to `${API_BASE}${endpoint}`.
 *
 * - Attaches the JWT Bearer token from localStorage if available.
 * - On 401: clears stored credentials and redirects to /login
 *   (unless the failing endpoint is the login endpoint itself).
 * - On 204 No Content: returns undefined cast to T.
 * - On connection / proxy errors: throws MockFallbackError so callers
 *   can silently fall back to mock data.
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Include Bearer token only when one is stored
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })

    if (res.status === 401) {
      if (endpoint.includes('/auth/login')) {
        // For the login endpoint, surface the server's error message directly
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? 'Invalid email or password.')
      }
      // For all other endpoints, a 401 means the session expired — force re-login
      localStorage.removeItem('dc-token')
      localStorage.removeItem('dc-user')
      window.location.href = '/login'
      throw new Error('Session expired. Please log in again.')
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      // Treat gateway errors with empty bodies as connection failures → mock fallback
      if (isProxyError(res.status, body)) throw new MockFallbackError()
      // Unwrap ASP.NET Identity error arrays into a readable string
      const identityErrors = Array.isArray(body?.errors)
        ? (body.errors as Array<string | { description?: string }>)
            .map(e => (typeof e === 'string' ? e : e?.description ?? ''))
            .filter(Boolean)
            .join(' ')
        : null
      throw new Error(body?.message ?? identityErrors ?? `Request failed (${res.status})`)
    }

    // DELETE endpoints return 204 with no body
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  } catch (err) {
    if (isConnectionError(err)) {
      // Network-level failure — signal to callers that mock data should be used
      throw new MockFallbackError()
    }
    throw err
  }
}

// ── Mock fallback sentinel ────────────────────────────────────

/** Thrown internally to signal that a mock fallback should be used. */
class MockFallbackError extends Error {
  constructor() { super('__mock__') }
}

/** Type guard — returns true only for MockFallbackError instances. */
function isMock(e: unknown): boolean {
  return e instanceof MockFallbackError
}

// ──────────────────────────────────────────────────────────────
// Auth API
// ──────────────────────────────────────────────────────────────

export interface LoginRequest    { email: string; password: string }
export interface RegisterRequest { email: string; password: string; fullName?: string }
export interface RegisterAdminRequest { email: string; password: string; fullName?: string; adminCode: string }

/** Shape of a successful login response from the server. */
export interface LoginResponse {
  token: string
  email: string
  fullName: string | null
  role: string
  expiresAt: string
}

// In-memory store used by the mock fallback to simulate registered users
interface MockUser { email: string; password: string; fullName: string | null; role: string }
const mockUserRegistry = new Map<string, MockUser>()

/**
 * Authenticates a user and returns a login response containing a JWT.
 * Mock fallback: accepts any email/password and returns a mock Admin token.
 * If the email was previously registered via the mock register functions,
 * the stored role and name are used instead.
 */
export const loginUser = async (d: LoginRequest): Promise<LoginResponse> => {
  try {
    return await fetchApi<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(d) })
  } catch (e) {
    if (isMock(e)) {
      const key = d.email.toLowerCase()
      const registered = mockUserRegistry.get(key)
      const role     = registered?.role     ?? 'Admin'
      const fullName = registered?.fullName ?? d.email.split('@')[0]
      return {
        token: 'mock-token',
        email: d.email,
        fullName,
        role,
        expiresAt: '2099-01-01T00:00:00Z',
      }
    }
    throw e
  }
}

/**
 * Registers a new standard (read-only) user account.
 * Mock fallback: stores the user in the in-memory registry with role "User".
 */
export const registerUser = async (d: RegisterRequest): Promise<{ message: string }> => {
  try {
    return await fetchApi<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(d) })
  } catch (e) {
    if (isMock(e)) {
      const key = d.email.toLowerCase()
      if (mockUserRegistry.has(key)) throw new Error(`Email '${d.email}' is already registered.`)
      mockUserRegistry.set(key, { email: d.email, password: d.password, fullName: d.fullName ?? null, role: 'User' })
      return { message: 'Registration successful. You have read-only access.' }
    }
    throw e
  }
}

/**
 * Registers a new administrator account using the shared admin code.
 * Mock fallback: validates against the hardcoded demo code "ADMIN@DEVICE2024"
 * and stores the user with role "Admin".
 */
export const registerAdmin = async (d: RegisterAdminRequest): Promise<{ message: string }> => {
  try {
    return await fetchApi<{ message: string }>('/auth/register-admin', { method: 'POST', body: JSON.stringify(d) })
  } catch (e) {
    if (isMock(e)) {
      // Demo admin code used when there is no backend
      if (d.adminCode !== 'ADMIN@DEVICE2024')
        throw new Error('Invalid admin registration code.')
      const key = d.email.toLowerCase()
      if (mockUserRegistry.has(key)) throw new Error(`Email '${d.email}' is already registered.`)
      mockUserRegistry.set(key, { email: d.email, password: d.password, fullName: d.fullName ?? null, role: 'Admin' })
      return { message: 'Admin registration successful. You have full CRUD access.' }
    }
    throw e
  }
}

// ──────────────────────────────────────────────────────────────
// Device API
// ──────────────────────────────────────────────────────────────

/** Full device representation returned by the API. */
export interface DeviceDto {
  id: number
  serialNumber: string
  model: string | null
  status: string
  firmwareVersion: string | null
  createdAt: string
  updatedAt: string
}

/** Extended DTO returned by the /devices/outdated endpoint. */
export interface OutdatedDeviceDto {
  id: number
  serialNumber: string
  model: string | null
  status: string
  currentFirmware: string
  latestFirmware: string
  updatedAt: string
}

/** Request body for creating a new device. */
export interface CreateDeviceRequest {
  serialNumber: string
  model?: string
  status: string
  firmwareVersion?: string
}

/** Request body for partially updating an existing device. */
export interface UpdateDeviceRequest {
  serialNumber?: string
  model?: string
  status?: string
  firmwareVersion?: string
}

// Mutable mock device store — modified by create/update/delete mock fallbacks
let mockDevices = [...MOCK_DEVICES]
let nextMockId  = 100

/**
 * Fetches all devices, optionally filtered by lifecycle status.
 * Mock fallback: filters the in-memory device list.
 */
export const getDevices = async (status?: string): Promise<DeviceDto[]> => {
  try {
    return await fetchApi<DeviceDto[]>(`/devices${status ? `?status=${encodeURIComponent(status)}` : ''}`)
  } catch (e) {
    if (isMock(e)) return status ? mockDevices.filter(d => d.status === status) : [...mockDevices]
    throw e
  }
}

/**
 * Fetches a single device by its numeric ID.
 * Mock fallback: searches the in-memory device list.
 */
export const getDevice = async (id: number): Promise<DeviceDto> => {
  try {
    return await fetchApi<DeviceDto>(`/devices/${id}`)
  } catch (e) {
    if (isMock(e)) {
      const d = mockDevices.find(d => d.id === id)
      if (!d) throw new Error('Device not found')
      return d
    }
    throw e
  }
}

/**
 * Creates a new device on the server.
 * Mock fallback: validates serial uniqueness and pushes to the in-memory list.
 */
export const createDevice = async (d: CreateDeviceRequest): Promise<DeviceDto> => {
  try {
    return await fetchApi<DeviceDto>('/devices', { method: 'POST', body: JSON.stringify(d) })
  } catch (e) {
    if (isMock(e)) {
      if (mockDevices.some(x => x.serialNumber === d.serialNumber))
        throw new Error(`A device with serial number '${d.serialNumber}' already exists.`)
      const now = new Date().toISOString()
      const created: DeviceDto = {
        id: nextMockId++, serialNumber: d.serialNumber,
        model: d.model ?? null, status: d.status,
        firmwareVersion: d.firmwareVersion ?? null,
        createdAt: now, updatedAt: now,
      }
      mockDevices.push(created)
      return created
    }
    throw e
  }
}

/**
 * Partially updates an existing device (only provided fields are changed).
 * Mock fallback: merges non-undefined fields into the matching in-memory entry.
 */
export const updateDevice = async (id: number, d: UpdateDeviceRequest): Promise<DeviceDto> => {
  try {
    return await fetchApi<DeviceDto>(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(d) })
  } catch (e) {
    if (isMock(e)) {
      const idx = mockDevices.findIndex(x => x.id === id)
      if (idx === -1) throw new Error('Device not found')
      // Only spread fields that were explicitly provided in the request
      mockDevices[idx] = {
        ...mockDevices[idx],
        ...(d.serialNumber    !== undefined && { serialNumber:    d.serialNumber }),
        ...(d.model           !== undefined && { model:           d.model }),
        ...(d.status          !== undefined && { status:          d.status }),
        ...(d.firmwareVersion !== undefined && { firmwareVersion: d.firmwareVersion }),
        updatedAt: new Date().toISOString(),
      }
      return mockDevices[idx]
    }
    throw e
  }
}

/**
 * Permanently deletes a device by ID.
 * Mock fallback: removes the entry from the in-memory list.
 */
export const deleteDevice = async (id: number): Promise<void> => {
  try {
    return await fetchApi<void>(`/devices/${id}`, { method: 'DELETE' })
  } catch (e) {
    if (isMock(e)) { mockDevices = mockDevices.filter(x => x.id !== id); return }
    throw e
  }
}

/**
 * Returns all devices whose firmware version is behind the latest catalog entry.
 * Mock fallback: returns the static MOCK_OUTDATED list.
 */
export const getOutdatedDevices = async (): Promise<OutdatedDeviceDto[]> => {
  try {
    return await fetchApi<OutdatedDeviceDto[]>('/devices/outdated')
  } catch (e) {
    if (isMock(e)) return [...MOCK_OUTDATED]
    throw e
  }
}

/**
 * Returns all devices with no firmware version assigned.
 * Mock fallback: filters the in-memory list for null firmwareVersion.
 */
export const getMissingFirmwareDevices = async (): Promise<DeviceDto[]> => {
  try {
    return await fetchApi<DeviceDto[]>('/devices/missing-firmware')
  } catch (e) {
    if (isMock(e)) return mockDevices.filter(d => !d.firmwareVersion)
    throw e
  }
}

// ──────────────────────────────────────────────────────────────
// Firmware API
// ──────────────────────────────────────────────────────────────

/** Single firmware catalog entry. */
export interface FirmwareVersionDto  { id: number; version: string; notes: string | null }
/** Request body for publishing a new firmware version. */
export interface AddFirmwareRequest  { version: string; notes?: string }

// Mutable mock firmware store
let mockFirmware = [...MOCK_FIRMWARE]
let nextFwId     = 10

/**
 * Fetches the full firmware version catalog.
 * Mock fallback: returns a copy of the in-memory firmware list.
 */
export const getFirmwareVersions = async (): Promise<FirmwareVersionDto[]> => {
  try {
    return await fetchApi<FirmwareVersionDto[]>('/firmware')
  } catch (e) {
    if (isMock(e)) return [...mockFirmware]
    throw e
  }
}

/**
 * Publishes a new firmware version to the catalog.
 * Mock fallback: validates version uniqueness and pushes to the in-memory list.
 */
export const addFirmwareVersion = async (d: AddFirmwareRequest): Promise<FirmwareVersionDto> => {
  try {
    return await fetchApi<FirmwareVersionDto>('/firmware', { method: 'POST', body: JSON.stringify(d) })
  } catch (e) {
    if (isMock(e)) {
      if (mockFirmware.some(f => f.version === d.version))
        throw new Error(`Firmware version '${d.version}' already exists.`)
      const created = { id: nextFwId++, version: d.version, notes: d.notes ?? null }
      mockFirmware.push(created)
      return created
    }
    throw e
  }
}

// ──────────────────────────────────────────────────────────────
// Change Log API
// ──────────────────────────────────────────────────────────────

/** A single change-log entry without device context. */
export interface ChangeLogEntryDto { id: number; action: string; createdAt: string }

/** A change-log entry enriched with the device's serial number. */
export interface ChangeLogEntryWithDeviceDto {
  id: number
  deviceId: number | null
  serialNumber: string
  action: string
  createdAt: string
}

/** Full device history including current state and ordered event list. */
export interface DeviceHistoryDto {
  deviceId: number
  serialNumber: string
  model: string | null
  status: string
  firmwareVersion: string | null
  createdAt: string
  updatedAt: string
  history: ChangeLogEntryDto[]
}

/** Optional query filters for the change-log list endpoint. */
export interface ChangeLogFilters {
  deviceId?: number
  action?: string
  from?: string
  to?: string
}

/**
 * Fetches all change logs, optionally narrowed by the provided filters.
 * Mock fallback: filters the static MOCK_CHANGELOGS array client-side.
 */
export const getChangeLogs = async (filters?: ChangeLogFilters): Promise<ChangeLogEntryWithDeviceDto[]> => {
  // Build query string from whatever filters are provided
  const p = new URLSearchParams()
  if (filters?.deviceId) p.set('deviceId', String(filters.deviceId))
  if (filters?.action)   p.set('action',   filters.action)
  if (filters?.from)     p.set('from',     filters.from)
  if (filters?.to)       p.set('to',       filters.to)
  const q = p.toString()
  try {
    return await fetchApi<ChangeLogEntryWithDeviceDto[]>(`/changelogs${q ? `?${q}` : ''}`)
  } catch (e) {
    if (isMock(e)) {
      let logs = [...MOCK_CHANGELOGS]
      if (filters?.deviceId) logs = logs.filter(l => l.deviceId === filters.deviceId)
      // Case-insensitive substring match for the action filter
      if (filters?.action)   logs = logs.filter(l => l.action.toUpperCase().includes(filters.action!.toUpperCase()))
      return logs
    }
    throw e
  }
}

/**
 * Fetches the complete change history for a specific device.
 * Mock fallback: builds the history from MOCK_CHANGELOGS filtered by deviceId.
 */
export const getDeviceHistory = async (deviceId: number): Promise<DeviceHistoryDto> => {
  try {
    return await fetchApi<DeviceHistoryDto>(`/changelogs/device/${deviceId}`)
  } catch (e) {
    if (isMock(e)) {
      const device = mockDevices.find(d => d.id === deviceId)
      if (!device) throw new Error('Device not found')
      const history = MOCK_CHANGELOGS
        .filter(l => l.deviceId === deviceId)
        .map(l => ({ id: l.id, action: l.action, createdAt: l.createdAt }))
      return { deviceId, serialNumber: device.serialNumber, model: device.model, status: device.status, firmwareVersion: device.firmwareVersion, createdAt: device.createdAt, updatedAt: device.updatedAt, history }
    }
    throw e
  }
}
