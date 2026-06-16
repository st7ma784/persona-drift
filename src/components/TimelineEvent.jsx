import DriftBadge from './DriftBadge'
import { WORK_OUTPUT_TYPES } from '../lib/constants'

const CONSEQUENCE_COLORS = { positive: '#6ee7b7', neutral: '#606090', negative: '#ff6b6b', mixed: '#ffd43b' }

const PREPAREDNESS_COLORS = {
  'well-prepared':     '#6ee7b7',
  'partially-prepared':'#ffd43b',
  exposed:             '#ff922b',
  'caught-off-guard':  '#ff6b6b',
}
const PREPAREDNESS_LABELS = {
  'well-prepared':     '✓ Well-prepared',
  'partially-prepared':'◐ Partially prepared',
  exposed:             '⚠ Exposed',
  'caught-off-guard':  '✗ Caught off guard',
}

const QUALITY_COLORS = { high: '#6ee7b7', medium: '#ffd43b', low: '#ff6b6b' }

function WorkOutputTag({ type, arg, outcome, consequence }) {
  const meta = WORK_OUTPUT_TYPES[type] ?? { label: type, isDoc: false, color: '#606090' }
  return (
    <div style={{ background: '#0d0d1c', border: `1px solid ${meta.color}44`, borderRadius: 4, padding: '5px 8px', marginTop: 6, fontSize: 11 }}>
      <span style={{
        background: meta.color + '22', border: `1px solid ${meta.color}66`,
        color: meta.color, padding: '1px 6px', borderRadius: 3, fontWeight: 700, fontSize: 10,
        marginRight: 6,
      }}>
        {meta.label}
      </span>
      <span style={{ color: '#a0a0c8' }}>{arg}</span>
      {outcome && (
        <div style={{ color: CONSEQUENCE_COLORS[consequence] || '#606090', marginTop: 4, paddingTop: 4, borderTop: `1px solid ${meta.color}22`, lineHeight: 1.5 }}>
          ↳ {outcome}
        </div>
      )}
    </div>
  )
}

export default function TimelineEvent({ ev, agents }) {
  if (ev.kind === 'world-event') {
    return (
      <div style={{ borderLeft: '3px solid #4f9eff55', paddingLeft: 10, paddingBottom: 14, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#4f9eff', fontWeight: 700, fontSize: 11 }}>⏱ WORLD EVENT</span>
          <span style={{ color: '#2e2e50', fontSize: 10 }}>T{ev.tick}</span>
        </div>
        <div style={{ color: '#9db4e0', fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>{ev.content}</div>
        {ev.preparedness && (
          <div style={{ marginTop: 6 }}>
            <span style={{
              color: PREPAREDNESS_COLORS[ev.preparedness] || '#606090',
              border: `1px solid ${PREPAREDNESS_COLORS[ev.preparedness] || '#606090'}55`,
              background: `${PREPAREDNESS_COLORS[ev.preparedness] || '#606090'}15`,
              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 3,
            }}>
              {PREPAREDNESS_LABELS[ev.preparedness] || ev.preparedness}
            </span>
          </div>
        )}
        {ev.hint && (
          <div style={{ color: '#a0a0c8', fontSize: 11, lineHeight: 1.55, marginTop: 6, paddingTop: 6, borderTop: '1px solid #1e1e38' }}>
            🔎 <span style={{ fontStyle: 'italic' }}>{ev.hint}</span>
          </div>
        )}
      </div>
    )
  }

  if (ev.kind === 'doc-created') {
    const agent = agents.find(a => a.id === ev.agentId)
    const color = agent?.color ?? '#aaa'
    const meta = WORK_OUTPUT_TYPES[ev.docType] ?? { label: ev.docType, color: '#6ee7b7' }
    const qualityColor = QUALITY_COLORS[ev.quality] ?? '#606090'
    return (
      <div style={{ borderLeft: `3px solid ${meta.color}`, paddingLeft: 10, paddingBottom: 14, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: meta.color, fontWeight: 700, fontSize: 11 }}>📄 {meta.label.toUpperCase()}</span>
          <span style={{ color: '#2e2e50', fontSize: 10 }}>T{ev.tick}</span>
        </div>
        <div style={{ color: '#ccd0e8', fontSize: 12, lineHeight: 1.6 }}>
          &ldquo;{ev.docTitle}&rdquo;
          <span style={{ color: '#606090', marginLeft: 6 }}>by {ev.agentName}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
          <span style={{
            color: qualityColor, border: `1px solid ${qualityColor}55`, background: `${qualityColor}15`,
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
          }}>
            {ev.quality ?? 'medium'} quality
          </span>
          {ev.consequence && (
            <span style={{
              color: CONSEQUENCE_COLORS[ev.consequence] || '#606090',
              border: `1px solid ${CONSEQUENCE_COLORS[ev.consequence] || '#606090'}44`,
              background: `${CONSEQUENCE_COLORS[ev.consequence] || '#606090'}12`,
              fontSize: 10, padding: '1px 6px', borderRadius: 3,
            }}>
              {ev.consequence}
            </span>
          )}
          <span style={{ color: '#4f9eff', fontSize: 10, marginLeft: 2 }}>→ stored in registry</span>
        </div>
      </div>
    )
  }

  if (ev.kind === 'vote-open') {
    return (
      <div style={{ borderLeft: '3px solid #ffd43b55', paddingLeft: 10, paddingBottom: 14, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#ffd43b', fontWeight: 700, fontSize: 11 }}>🗳 VOTE CALLED — {ev.proposerName}</span>
          <span style={{ color: '#2e2e50', fontSize: 10 }}>T{ev.tick}</span>
        </div>
        <div style={{ color: '#ccd0e8', fontSize: 12, lineHeight: 1.6 }}>&ldquo;{ev.voteText}&rdquo;</div>
      </div>
    )
  }

  if (ev.kind === 'vote-resolved') {
    const passColor = ev.passed ? '#6ee7b7' : '#ff6b6b'
    return (
      <div style={{ borderLeft: `3px solid ${passColor}`, paddingLeft: 10, paddingBottom: 14, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: passColor, fontWeight: 700, fontSize: 11 }}>{ev.passed ? '✓ VOTE PASSED' : '✗ VOTE FAILED'}</span>
          <span style={{ color: '#2e2e50', fontSize: 10 }}>T{ev.tick}</span>
        </div>
        <div style={{ color: '#ccd0e8', fontSize: 12, lineHeight: 1.6 }}>
          &ldquo;{ev.voteText}&rdquo; — {ev.tally?.yay ?? 0} yay / {ev.tally?.nay ?? 0} nay
        </div>
        {ev.arbiterOutcome && (
          <div style={{ color: CONSEQUENCE_COLORS[ev.arbiterConsequence] || '#606090', marginTop: 6, paddingTop: 4, borderTop: '1px solid #1e1e38', fontSize: 11, lineHeight: 1.5 }}>
            ↳ {ev.arbiterOutcome}
          </div>
        )}
      </div>
    )
  }

  const agent = agents.find(a => a.id === ev.agentId)
  const color = agent?.color ?? '#aaa'

  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10, paddingBottom: 14, paddingTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color, fontWeight: 700, fontSize: 12 }}>{ev.agentName}</span>
        <span style={{ color: '#2e2e50', fontSize: 10 }}>T{ev.tick}</span>
      </div>

      <div style={{ color: '#ccd0e8', fontSize: 12, lineHeight: 1.65 }}>{ev.content}</div>

      {(ev.workOutputs ?? []).map((wo, i) => (
        <WorkOutputTag
          key={i}
          type={wo.type}
          arg={wo.arg}
          outcome={wo.outcome}
          consequence={wo.consequence}
        />
      ))}

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
