import DriftBadge from './DriftBadge'

const CONSEQUENCE_COLORS = { positive: '#6ee7b7', neutral: '#606090', negative: '#ff6b6b', mixed: '#ffd43b' }

export default function TimelineEvent({ ev, agents }) {
  const agent = agents.find(a => a.id === ev.agentId)
  const color = agent?.color ?? '#aaa'

  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10, paddingBottom: 14, paddingTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color, fontWeight: 700, fontSize: 12 }}>{ev.agentName}</span>
        <span style={{ color: '#2e2e50', fontSize: 10 }}>T{ev.tick}</span>
      </div>

      <div style={{ color: '#ccd0e8', fontSize: 12, lineHeight: 1.65 }}>{ev.content}</div>

      {ev.action && (
        <div style={{ background: '#0d0d1c', border: '1px solid #1e1e38', borderRadius: 4, padding: '5px 8px', marginTop: 6, fontSize: 11 }}>
          <span style={{ color: '#606090' }}>→ </span>
          <span style={{ color: '#a0a0c8' }}>{ev.action}</span>
          {ev.arbiterOutcome && (
            <div style={{ color: CONSEQUENCE_COLORS[ev.arbiterConsequence] || '#606090', marginTop: 4, paddingTop: 4, borderTop: '1px solid #1e1e38', lineHeight: 1.5 }}>
              ↳ {ev.arbiterOutcome}
            </div>
          )}
        </div>
      )}

      {ev.assessment && (ev.assessment.deviationType || ev.assessment.flaggedBehaviors?.length > 0) && (
        <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {ev.assessment.deviationType && <DriftBadge type={ev.assessment.deviationType} natural={ev.assessment.naturalDrift} />}
          {(ev.assessment.flaggedBehaviors ?? []).slice(0, 2).map(fb => (
            <span key={fb} style={{ color: '#ff9090', fontSize: 10, background: '#ff444410', padding: '1px 5px', borderRadius: 3, border: '1px solid #ff444430' }}>
              {fb}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
