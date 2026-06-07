import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'

interface StatusData {
  status: string
  count: number
}

interface Props {
  data: StatusData[]
}

const STATUS_COLORS: Record<string, { light: string; dark: string }> = {
  active:         { light: '#10b981', dark: '#34d399' },
  inactive:       { light: '#94a3b8', dark: '#64748b' },
  retired:        { light: '#f59e0b', dark: '#fbbf24' },
  decommissioned: { light: '#ef4444', dark: '#f87171' },
}

const DEFAULT_COLOR = { light: '#6366f1', dark: '#818cf8' }

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; payload: StatusData }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const { value } = payload[0]
  const colors    = STATUS_COLORS[label?.toLowerCase() ?? ''] ?? DEFAULT_COLOR

  return (
    <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700/80 rounded-lg shadow-lg px-3.5 py-2.5 text-sm">
      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize mb-0.5">{label}</p>
      <p className="text-2xl font-bold" style={{ color: colors.light }}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {value === 1 ? 'device' : 'devices'}
      </p>
    </div>
  )
}

export default function FirmwareChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark    = theme === 'dark'

  const gridColor  = isDark ? '#1f2937'  : '#f3f4f6'
  const axisColor  = isDark ? '#4b5563'  : '#d1d5db'
  const labelColor = isDark ? '#9ca3af'  : '#6b7280'

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        barCategoryGap="30%"
      >
        <defs>
          {data.map(({ status }) => {
            const id     = `grad-${status}`
            const colors = STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR
            return (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={isDark ? colors.dark : colors.light} stopOpacity={0.95} />
                <stop offset="100%" stopColor={isDark ? colors.dark : colors.light} stopOpacity={0.55} />
              </linearGradient>
            )
          })}
        </defs>

        <CartesianGrid
          vertical={false}
          stroke={gridColor}
          strokeDasharray="0"
        />

        <XAxis
          dataKey="status"
          axisLine={false}
          tickLine={false}
          tick={{ fill: labelColor, fontSize: 12, fontFamily: 'Inter' }}
          tickFormatter={s => s.charAt(0).toUpperCase() + s.slice(1)}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: labelColor, fontSize: 11, fontFamily: 'Inter' }}
          allowDecimals={false}
          width={28}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', radius: 6 }}
        />

        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={72}>
          {data.map(({ status }) => (
            <Cell key={status} fill={`url(#grad-${status})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
