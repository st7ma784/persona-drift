import { FLAW_COLORS } from '../lib/constants'

export default function DriftBadge({ type, natural }) {
  if (!type) return null
  const c = FLAW_COLORS[type] || '#6366f1'
  return (
    <span style={{
      background: c + '28', border: `1px solid ${c}88`, color: c,
      padding: '2px 7px', borderRadius: 3, fontSize: 10,
      fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {natural ? '⚡ ' : '⚗ '}{type}
    </span>
  )
}
