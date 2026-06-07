import { RADAR_DIMS, RADAR_LABELS } from '../lib/constants'

export default function RadarChart({ scores, baseline, color, size = 150 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.34
  const angles = RADAR_DIMS.map((_, i) => (i / RADAR_DIMS.length) * 2 * Math.PI - Math.PI / 2)
  const toXY = (score, a) => [cx + r * (score / 100) * Math.cos(a), cy + r * (score / 100) * Math.sin(a)]
  const poly = s => angles.map((a, i) => toXY(s[RADAR_DIMS[i]] ?? 50, a).join(',')).join(' ')

  return (
    <svg width={size} height={size} style={{ overflow: 'visible', flexShrink: 0 }}>
      {[25, 50, 75, 100].map(lv => (
        <polygon key={lv} points={angles.map(a => toXY(lv, a).join(',')).join(' ')}
          fill="none" stroke="#1e1e38" strokeWidth={1} />
      ))}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={toXY(100, a)[0]} y2={toXY(100, a)[1]}
          stroke="#1e1e38" strokeWidth={1} />
      ))}
      {baseline && (
        <polygon points={poly(baseline)}
          fill="rgba(255,255,255,0.04)" stroke="#33334a" strokeWidth={1.5} strokeDasharray="3,3" />
      )}
      <polygon points={poly(scores)} fill={color + '28'} stroke={color} strokeWidth={2} />
      {angles.map((a, i) => {
        const [lx, ly] = toXY(118, a)
        return <text key={i} x={lx} y={ly + 4} textAnchor="middle" fontSize={9} fill="#606090">{RADAR_LABELS[i]}</text>
      })}
    </svg>
  )
}
