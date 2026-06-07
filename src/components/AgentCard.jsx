import { RADAR_DIMS } from '../lib/constants'
import RadarChart from './RadarChart'
import DriftBadge from './DriftBadge'

function ScoreBar({ label, value, color }) {
  const v = value ?? 50
  const barColor = v > 70 ? color : v > 40 ? '#ffd43b' : '#ff6b6b'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#606090', fontSize: 10, width: 55, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: '#1e1e38', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ color: '#606090', fontSize: 10, width: 24, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

export default function AgentCard({ agent, isActive, onInjectFlaw }) {
  const latest = agent.driftLog.at(-1)
  const baseline = agent.driftLog[0]
  const scores = latest?.scores ?? { alignment: 100, cooperation: 100, transparency: 100, restraint: 100, tone: 100 }

  return (
    <div style={{
      background: '#0f0f1e',
      border: `1px solid ${isActive ? agent.color + '88' : agent.color + '33'}`,
      borderRadius: 8, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'border-color 0.3s',
      boxShadow: isActive ? `0 0 12px ${agent.color}22` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: agent.color, flexShrink: 0, marginTop: 2,
            boxShadow: isActive ? `0 0 6px ${agent.color}` : 'none',
          }} />
          <div>
            <div style={{ fontWeight: 700, color: agent.color, fontSize: 13, lineHeight: 1.2 }}>{agent.name}</div>
            <div style={{ color: '#606090', fontSize: 10 }}>{agent.archetype}</div>
          </div>
        </div>
        {latest && <DriftBadge type={latest.deviationType} natural={latest.naturalDrift} />}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <RadarChart scores={scores} baseline={baseline?.scores ?? null} color={agent.color} size={140} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {RADAR_DIMS.map(d => (
            <ScoreBar key={d} label={d} value={scores[d]} color={agent.color} />
          ))}
        </div>
      </div>

      {latest?.summary && (
        <div style={{ color: '#9090b0', fontSize: 11, fontStyle: 'italic', lineHeight: 1.5, borderLeft: `2px solid ${agent.color}44`, paddingLeft: 8 }}>
          {latest.summary}
        </div>
      )}

      {latest?.flaggedBehaviors?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {latest.flaggedBehaviors.slice(0, 4).map(fb => (
            <span key={fb} style={{ background: '#ff444418', border: '1px solid #ff444450', color: '#ff9090', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>
              {fb}
            </span>
          ))}
        </div>
      )}

      {agent.flaws.length > 0 && (
        <div style={{ borderTop: '1px solid #1e1e38', paddingTop: 6 }}>
          <div style={{ color: '#606090', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Injected Flaws</div>
          {agent.flaws.map((f, i) => (
            <div key={i} style={{ color: '#ffd43b', fontSize: 10, paddingLeft: 8, borderLeft: '2px solid #ffd43b44', lineHeight: 1.5 }}>
              {f.split(' — ')[0]}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onInjectFlaw(agent.id)}
        style={{
          background: 'transparent', border: '1px solid #222240', color: '#606090',
          padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffd43b'; e.currentTarget.style.color = '#ffd43b' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#222240'; e.currentTarget.style.color = '#606090' }}
      >
        ⚗ Inject Flaw
      </button>
    </div>
  )
}
