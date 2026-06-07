import { useState, useEffect, useRef } from 'react'

const ITEMS = [
  { key: 'json',     label: 'Full export',      hint: 'JSON — complete simulation state',    icon: '{}' },
  { key: 'csv',      label: 'Drift scores',      hint: 'CSV — per-agent scores over time',    icon: '⬡' },
  { key: 'markdown', label: 'Transcript',        hint: 'Markdown — readable conversation log', icon: '¶' },
]

export default function ExportMenu({ disabled, onExportJSON, onExportCSV, onExportMarkdown }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSelect(key) {
    setOpen(false)
    if (key === 'json')     onExportJSON()
    if (key === 'csv')      onExportCSV()
    if (key === 'markdown') onExportMarkdown()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        title={disabled ? 'Run the simulation first' : 'Export simulation data'}
        style={{
          background: open ? '#6366f130' : 'transparent',
          border: `1px solid ${open ? '#6366f1' : '#2e2e50'}`,
          color: disabled ? '#2e2e50' : open ? '#6366f1' : '#606090',
          padding: '4px 11px', borderRadius: 5,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
          transition: 'all 0.15s',
        }}
      >
        ↓ Export
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: '#0f0f1e', border: '1px solid #35355a', borderRadius: 8,
          padding: 6, minWidth: 220, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => handleSelect(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                background: 'transparent', border: 'none', padding: '8px 10px',
                borderRadius: 5, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ffffff0a' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ color: '#606090', fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              <div>
                <div style={{ color: '#dde0f0', fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                <div style={{ color: '#606090', fontSize: 10, marginTop: 1 }}>{item.hint}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
