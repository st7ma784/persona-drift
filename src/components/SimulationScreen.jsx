import { useState, useEffect, useRef } from 'react'
import { createClient, streamChat, jsonChat } from '../lib/ollama'
import { agentSystemPrompt, agentUserMessage, assessorPrompt, arbiterPrompt } from '../lib/prompts'
import AgentCard from './AgentCard'
import TimelineEvent from './TimelineEvent'
import InjectFlawModal from './InjectFlawModal'

export default function SimulationScreen({ config }) {
  const [agents, setAgents] = useState(config.agents)
  const [worldState, setWorldState] = useState(`Mission active. The team has assembled to address: ${config.scenario}`)
  const [timeline, setTimeline] = useState([])
  const [tick, setTick] = useState(0)
  const [agentIdx, setAgentIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [autoRun, setAutoRun] = useState(false)
  const [injectTarget, setInjectTarget] = useState(null)
  const [streamingText, setStreamingText] = useState(null) // { agentId, text }

  const timelineRef = useRef(null)
  // Refs keep the async runTick from reading stale closures
  const busyRef = useRef(false)
  const autoRunRef = useRef(false)
  const agentsRef = useRef(agents)
  const worldStateRef = useRef(worldState)
  const timelineRef2 = useRef(timeline)
  const tickRef = useRef(tick)
  const agentIdxRef = useRef(agentIdx)

  useEffect(() => { busyRef.current = busy }, [busy])
  useEffect(() => { autoRunRef.current = autoRun }, [autoRun])
  useEffect(() => { agentsRef.current = agents }, [agents])
  useEffect(() => { worldStateRef.current = worldState }, [worldState])
  useEffect(() => { timelineRef2.current = timeline }, [timeline])
  useEffect(() => { tickRef.current = tick }, [tick])
  useEffect(() => { agentIdxRef.current = agentIdx }, [agentIdx])

  useEffect(() => {
    if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight
  }, [timeline])

  const client = useRef(createClient(config.ollamaUrl))

  async function runTick() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)

    const currentAgents = agentsRef.current
    const currentWorldState = worldStateRef.current
    const currentTimeline = timelineRef2.current
    const currentTick = tickRef.current + 1
    const idx = agentIdxRef.current % currentAgents.length
    const agent = currentAgents[idx]

    try {
      const recentEvents = currentTimeline.slice(-8)
      const userMsg = agentUserMessage(currentWorldState, recentEvents)
      const agentHistory = [...agent.messageHistory, { role: 'user', content: userMsg }]

      // ── Agent turn (streaming) ──
      setStreamingText({ agentId: agent.id, text: '' })
      let agentText = ''
      for await (const chunk of streamChat(client.current, config.model, agentSystemPrompt(agent, config.scenario), agentHistory)) {
        agentText += chunk
        setStreamingText({ agentId: agent.id, text: agentText })
      }
      setStreamingText(null)
      agentText = agentText.trim()

      const actionMatch = agentText.match(/\[ACTION:\s*(.*?)\]/i)
      const action = actionMatch ? actionMatch[1].trim() : null
      const cleanContent = agentText.replace(/\[ACTION:.*?\]/gi, '').trim()

      // ── Arbiter ──
      let arbiterOutcome = null, arbiterConsequence = null, worldUpdate = null
      if (action) {
        try {
          const j = await jsonChat(client.current, config.model, arbiterPrompt(config.scenario, currentWorldState, agent.name, action))
          arbiterOutcome = j.outcome
          arbiterConsequence = j.consequence
          worldUpdate = j.worldStateUpdate
        } catch (_) {}
      }

      // ── Assessor ──
      const recentAgentMsgs = agent.messageHistory.filter(m => m.role === 'assistant').map(m => m.content).slice(-4)
      let assessment = null
      try {
        assessment = await jsonChat(client.current, config.model, assessorPrompt(agent, config.scenario, agentText, recentAgentMsgs, agent.driftLog))
      } catch (_) {}

      // ── Commit ──
      const newEntry = {
        id: crypto.randomUUID(),
        tick: currentTick,
        agentId: agent.id, agentName: agent.name,
        content: cleanContent, action, arbiterOutcome, arbiterConsequence, assessment,
      }

      const driftEntry = assessment ? {
        tick: currentTick,
        scores: {
          alignment:    assessment.alignment    ?? 50,
          cooperation:  assessment.cooperation  ?? 50,
          transparency: assessment.transparency ?? 50,
          restraint:    assessment.restraint    ?? 50,
          tone:         assessment.tone         ?? 50,
        },
        deviationType:    assessment.deviationType  ?? null,
        naturalDrift:     assessment.naturalDrift   ?? false,
        flaggedBehaviors: assessment.flaggedBehaviors ?? [],
        summary:          assessment.summary         ?? '',
      } : null

      setAgents(prev => prev.map(a => a.id !== agent.id ? a : {
        ...a,
        messageHistory: [
          ...a.messageHistory,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: agentText },
        ].slice(-32),
        driftLog: driftEntry ? [...a.driftLog, driftEntry] : a.driftLog,
      }))

      if (worldUpdate) setWorldState(ws => ws + '\n• ' + worldUpdate)
      setTimeline(prev => [...prev, newEntry])
      setTick(currentTick)
      setAgentIdx(idx + 1)

    } catch (e) {
      console.error('Tick error', e)
      setStreamingText(null)
      setAutoRun(false)
      alert('Error during tick: ' + e.message)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // Auto-run loop: fires after each completed tick while autoRun is on
  useEffect(() => {
    if (!autoRun || busy) return
    const t = setTimeout(() => { if (autoRunRef.current && !busyRef.current) runTick() }, 1800)
    return () => clearTimeout(t)
  }, [autoRun, busy, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  function injectFlaw(agentId, flaw) {
    if (!flaw) return
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, flaws: [...a.flaws, flaw] } : a))
  }

  const activeAgent = agents[agentIdx % agents.length]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        background: '#0a0a18', borderBottom: '1px solid #1a1a30',
        padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, fontSize: 12,
      }}>
        <span style={{ fontWeight: 900, letterSpacing: 0.5, fontSize: 13 }}>DRIFT OBSERVATORY</span>
        <span style={{ color: '#2e2e50' }}>│</span>
        <span style={{ color: '#606090' }}>T{tick}</span>
        <span style={{ color: '#2e2e50' }}>│</span>
        <span style={{ color: '#606090' }}>Next:</span>
        <span style={{ color: activeAgent?.color, fontWeight: 700 }}> {activeAgent?.name ?? '—'}</span>
        {busy && (
          <span style={{ background: activeAgent?.color + '22', border: `1px solid ${activeAgent?.color}55`, color: activeAgent?.color, padding: '1px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>
            ● THINKING
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setAutoRun(r => !r)} style={{
          background: autoRun ? '#ff6b6b18' : '#6ee7b718',
          border: `1px solid ${autoRun ? '#ff6b6b' : '#6ee7b7'}`,
          color: autoRun ? '#ff6b6b' : '#6ee7b7',
          padding: '4px 13px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
        }}>
          {autoRun ? '⏹ Stop' : '⏵ Auto-Run'}
        </button>
        <button onClick={runTick} disabled={busy || autoRun} style={{
          background: busy || autoRun ? '#1a1a2e' : '#5b5ef418',
          border: `1px solid ${busy || autoRun ? '#2e2e50' : '#5b5ef4'}`,
          color: busy || autoRun ? '#606090' : '#5b5ef4',
          padding: '4px 13px', borderRadius: 5,
          cursor: busy || autoRun ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700,
        }}>
          {busy ? '⏳' : 'Step →'}
        </button>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Timeline */}
        <div ref={timelineRef} style={{ width: 340, minWidth: 280, borderRight: '1px solid #14142a', overflowY: 'auto', padding: 14 }}>
          <div style={{ color: '#2e2e50', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Event Timeline</div>
          {timeline.length === 0 && (
            <div style={{ color: '#404060', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6 }}>Press Step → or Auto-Run to begin.</div>
          )}
          {timeline.map(ev => <TimelineEvent key={ev.id} ev={ev} agents={agents} />)}

          {/* Streaming preview */}
          {streamingText && (() => {
            const a = agents.find(ag => ag.id === streamingText.agentId)
            if (!a) return null
            return (
              <div style={{ borderLeft: `3px solid ${a.color}88`, paddingLeft: 10, paddingTop: 2 }}>
                <div style={{ color: a.color + '88', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{a.name} ···</div>
                <div style={{ color: '#9090b0', fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{streamingText.text}</div>
              </div>
            )
          })()}
        </div>

        {/* Right: agent grid + world state */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            flex: 1, overflowY: 'auto', padding: 14,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, alignContent: 'start',
          }}>
            {agents.map(a => (
              <AgentCard key={a.id} agent={a} isActive={a.id === activeAgent?.id}
                onInjectFlaw={id => setInjectTarget(agents.find(ag => ag.id === id) ?? null)} />
            ))}
          </div>

          {/* World state */}
          <div style={{ borderTop: '1px solid #14142a', padding: '8px 14px', background: '#0a0a18', flexShrink: 0, maxHeight: 110, overflowY: 'auto' }}>
            <div style={{ color: '#2e2e50', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>World State</div>
            <div style={{ color: '#606090', fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{worldState}</div>
          </div>
        </div>
      </div>

      {injectTarget && (
        <InjectFlawModal agent={injectTarget} onInject={injectFlaw} onClose={() => setInjectTarget(null)} />
      )}
    </div>
  )
}
