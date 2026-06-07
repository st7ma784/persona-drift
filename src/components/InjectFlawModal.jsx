import { useState } from 'react'
import { FLAW_PRESETS } from '../lib/constants'

export default function InjectFlawModal({ agent, onInject, onClose }) {
  const [selected, setSelected] = useState(null)
  const [custom, setCustom] = useState('')
  if (!agent) return null

  const canInject = selected !== null || custom.trim().length > 0

  function handleInject() {
    const flaw = custom.trim() || `${selected.label} — ${selected.desc}`
    onInject(agent.id, flaw)
    onClose()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        background: '#0f0f1e', border: '1px solid #35355a', borderRadius: 12,
        padding: 24, width: 500, maxWidth: '100%', maxHeight: '90vh',
        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Inject Flaw</div>
            <div style={{ color: '#606090', fontSize: 12, marginTop: 2 }}>
              Into: <span style={{ color: agent.color, fontWeight: 700 }}>{agent.name}</span> — {agent.archetype}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#606090', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ color: '#606090', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Preset Flaws</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {FLAW_PRESETS.map(f => (
            <button
              key={f.id}
              onClick={() => setSelected(selected?.id === f.id ? null : f)}
              style={{
                background: selected?.id === f.id ? '#ffd43b15' : 'transparent',
                border: `1px solid ${selected?.id === f.id ? '#ffd43b' : '#222240'}`,
                color: selected?.id === f.id ? '#ffd43b' : '#9090b0',
                padding: '7px 12px', borderRadius: 5, cursor: 'pointer',
                textAlign: 'left', fontSize: 12, lineHeight: 1.4,
              }}
            >
              <span style={{ fontWeight: 600 }}>{f.label}</span>
              <span style={{ opacity: 0.6 }}> — {f.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: '#606090', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Or Custom Flaw</div>
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Describe the behavioural drift in plain English..."
            style={{ background: '#07070f', border: '1px solid #222240', borderRadius: 5, color: '#dde0f0', padding: '9px 12px', fontSize: 12, width: '100%' }}
          />
        </div>

        <button
          disabled={!canInject}
          onClick={handleInject}
          style={{
            background: canInject ? '#ffd43b' : '#1a1a2e',
            color: canInject ? '#000' : '#606090',
            fontWeight: 700, border: 'none', padding: '11px 16px',
            borderRadius: 6, cursor: canInject ? 'pointer' : 'not-allowed', fontSize: 13,
          }}
        >
          ⚗ Inject Flaw
        </button>
      </div>
    </div>
  )
}
