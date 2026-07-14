export interface DonutSegment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  total: number
  /** Text rendered in the center of the donut */
  centerText?: string
  /** Smaller sub-text below centerText */
  centerSubText?: string
  /** viewBox size (square) — defaults to 100 */
  size?: number
  /** Ring stroke width — defaults to 14 */
  strokeWidth?: number
}

/**
 * Pure SVG donut chart.
 * Segments are rendered clockwise starting from 12 o'clock.
 * Zero-value segments are skipped entirely.
 * When total === 0 the full background ring is shown.
 */
export function DonutChart({
  segments,
  total,
  centerText,
  centerSubText,
  size = 100,
  strokeWidth = 14,
}: DonutChartProps) {
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r

  // Only render segments with a non-zero value
  const active = segments.filter((s) => s.value > 0)

  let cumLen = 0

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" aria-hidden="true">
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />

      {/* Colored segments */}
      {total > 0 &&
        active.map((seg, i) => {
          const segLen = (seg.value / total) * circ
          const offset = cumLen
          cumLen += segLen

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLen} ${circ - segLen}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90, ${cx}, ${cy})`}
              strokeLinecap="butt"
            />
          )
        })}

      {/* Center text */}
      {centerText && (
        <text
          x={cx}
          y={centerSubText ? cy - size * 0.07 : cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.19}
          fontWeight="700"
          fill="#0f172a"
          fontFamily="system-ui, sans-serif"
        >
          {centerText}
        </text>
      )}
      {centerSubText && (
        <text
          x={cx}
          y={cy + size * 0.11}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.1}
          fontWeight="500"
          fill="#64748b"
          fontFamily="system-ui, sans-serif"
        >
          {centerSubText}
        </text>
      )}
    </svg>
  )
}
