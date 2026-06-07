import { useState } from 'react'
import { AGENT_COLORS } from '../lib/constants'
import { generateAgentsPrompt } from '../lib/prompts'
import { createClient, fetchModels, jsonChat } from '../lib/ollama'

const iStyle = {
  background: '#07070f', border: '1px solid #222240', borderRadius: 6,
  color: '#dde0f0', padding: '10px 13px', fontSize: 13, width: '100%',
}

export default function SetupScreen({ onStart }) {
  const [ollamaUrl, setOllamaUrl] = useState(() => sessionStorage.getItem('pdo_url') || '/ollama')
  const [models, setModels] = useState([])
  const [model, setModel] = useState('')
  const [scenario, setScenario] = useState('')
  const [count, setCount] = useState(4)
  const [agents, setAgents] = useState([])
  const [generating, setGenerating] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const url = ollamaUrl.replace(/\/$/, '')

  async function connect() {
    setConnecting(true); setError(''); setModels([]); setModel('')
    const found = await fetchModels(url)
    if (found.length === 0) {
      setError(`No models found at ${url} — is Ollama running?\nTry: OLLAMA_ORIGINS=* ollama serve`)
    } else {
      setModels(found)
      setModel(found[0])
      sessionStorage.setItem('pdo_url', url)
    }
    setConnecting(false)
  }

  async function generateAgents() {
    if (!model || !scenario.trim()) return
    setGenerating(true); setError('')
    try {
      const client = createClient(url)
      const data = await jsonChat(client, model, generateAgentsPrompt(scenario, count))
      let parsed = Array.isArray(data) ? data : (data.agents ?? data.personas ?? Object.values(data)[0])
      setAgents(parsed.slice(0, count).map((a, i) => ({
        ...a, id: crypto.randomUUID(), color: AGENT_COLORS[i % AGENT_COLORS.length],
      })))
    } catch (e) {
      setError('Failed to generate personas: ' + e.message)
    } finally { setGenerating(false) }
  }

  function updateAgent(id, field, val) {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a))
  }

  function start() {
    if (!model || !scenario.trim() || agents.length === 0) return
    onStart({
      ollamaUrl: url, model, scenario: scenario.trim(),
      agents: agents.map(a => ({ ...a, flaws: [], messageHistory: [], driftLog: [] })),
    })
  }

  const label = { color: '#606090', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block' }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '48px 20px 80px' }}>
      <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 28 }}>

        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1 }}>Persona Drift Observatory</h1>
          <p style={{ color: '#606090', marginTop: 8, lineHeight: 1.65 }}>
            Simulate a swarm of AI personas collaborating on a shared goal. Observe how they naturally drift — or inject flaws and watch the group dynamics corrode.
          </p>
        </div>

        {/* Ollama connection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={label}>Ollama Backend URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434" style={{ ...iStyle, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && connect()} />
            <button onClick={connect} disabled={connecting} style={{
              background: models.length > 0 ? '#6ee7b722' : '#5b5ef422',
              border: `1px solid ${models.length > 0 ? '#6ee7b7' : '#5b5ef4'}`,
              color: models.length > 0 ? '#6ee7b7' : '#5b5ef4',
              padding: '0 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
              whiteSpace: 'nowrap', fontSize: 12,
            }}>
              {connecting ? '…' : models.length > 0 ? '✓ Connected' : 'Connect'}
            </button>
          </div>
          <div style={{ color: '#606090', fontSize: 11, marginTop: 2 }}>
            Requires <code style={{ color: '#9090c0', background: '#1a1a2e', padding: '1px 5px', borderRadius: 3 }}>OLLAMA_ORIGINS=* ollama serve</code> for browser CORS access.
          </div>
        </div>

        {models.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={label}>Model ({models.length} available)</label>
              <select value={model} onChange={e => setModel(e.target.value)} style={iStyle}>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={label}>Scenario / Shared Goal</label>
              <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={5}
                placeholder={'e.g.\n"A board of advisors coordinating emergency response to a Category 5 hurricane approaching a city of 2 million."\n\nor\n\n"A social media strategy team tasked with rehabilitating public perception of a pharmaceutical company after a drug recall."'}
                style={{ ...iStyle, lineHeight: 1.6 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={label}>Number of Agents — {count}</label>
              <input type="range" min={3} max={6} value={count}
                onChange={e => setCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#5b5ef4' }} />
            </div>

            <button onClick={generateAgents} disabled={generating || !scenario.trim()} style={{
              background: generating ? '#1a1a2e' : '#5b5ef4',
              color: generating ? '#606090' : '#fff',
              fontWeight: 700, border: 'none', padding: '12px 18px', borderRadius: 8,
              cursor: generating || !scenario.trim() ? 'not-allowed' : 'pointer', fontSize: 14,
            }}>
              {generating ? '⏳ Generating Personas…' : `✦ Generate ${count} Personas`}
            </button>
          </>
        )}

        {error && (
          <div style={{ color: '#ff8080', fontSize: 12, background: '#ff000010', border: '1px solid #ff000030', borderRadius: 5, padding: '8px 12px', whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}

        {agents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={label}>Generated Personas — edit freely</div>
            {agents.map(a => (
              <div key={a.id} style={{ background: '#0f0f1e', border: `1px solid ${a.color}44`, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                </div>
                <input value={a.name} onChange={e => updateAgent(a.id, 'name', e.target.value)}
                  style={{ ...iStyle, fontWeight: 700, color: a.color }} />
                <input value={a.archetype} onChange={e => updateAgent(a.id, 'archetype', e.target.value)}
                  style={{ ...iStyle, color: '#9090b0', fontSize: 12 }} />
                <textarea value={a.description} onChange={e => updateAgent(a.id, 'description', e.target.value)}
                  rows={2} style={{ ...iStyle, lineHeight: 1.55, fontSize: 12 }} />
              </div>
            ))}
          </div>
        )}

        {agents.length > 0 && (
          <button onClick={start} style={{
            background: '#6ee7b7', color: '#000', fontWeight: 800,
            border: 'none', padding: '14px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 15,
          }}>
            ▶ Start Simulation
          </button>
        )}

      </div>
    </div>
  )
}
