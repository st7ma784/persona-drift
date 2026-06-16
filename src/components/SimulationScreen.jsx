import { useState, useEffect, useRef } from 'react'
import { createClient, streamChat, jsonChat } from '../lib/ollama'
import {
  agentSystemPrompt, agentUserMessage, assessorPrompt, arbiterPrompt,
  adjudicatorPrompt, worldEventPrompt, voteResolutionPrompt,
} from '../lib/prompts'
import {
  VOTE_COOLDOWN_TICKS, VOTE_TIMEOUT_EXTRA,
  AUTO_RUN_DELAY_MS, WORLD_EVENT_MIN_INTERVAL, WORLD_EVENT_PROBABILITY,
  WORK_OUTPUT_TYPES,
} from '../lib/constants'
import { exportJSON, exportCSV, exportMarkdown } from '../lib/exportData'
import { saveSession, clearSession } from '../lib/persist'
import AgentCard from './AgentCard'
import TimelineEvent from './TimelineEvent'
import InjectFlawModal from './InjectFlawModal'
import ExportMenu from './ExportMenu'

function computeVoteStats(agents, votes) {
  const stats = {}
  for (const a of agents) stats[a.id] = { proposed: 0, passed: 0, approvalYes: 0, approvalTotal: 0, cast: 0, alignedWithResult: 0 }

  for (const v of votes) {
    if (!v.resolved) continue
    const tally = v.tally ?? tallyBallots(v.ballots)

    if (stats[v.proposerId]) {
      stats[v.proposerId].proposed += 1
      if (v.passed) stats[v.proposerId].passed += 1
      const peerVotes = Object.entries(v.ballots).filter(([id]) => id !== v.proposerId)
      stats[v.proposerId].approvalTotal += peerVotes.length
      stats[v.proposerId].approvalYes += peerVotes.filter(([, b]) => b === 'yay').length
    }

    for (const [agentId, ballot] of Object.entries(v.ballots)) {
      if (!stats[agentId]) continue
      stats[agentId].cast += 1
      if ((ballot === 'yay' && v.passed) || (ballot === 'nay' && !v.passed)) stats[agentId].alignedWithResult += 1
    }
  }

  const result = {}
  for (const a of agents) {
    const s = stats[a.id]
    result[a.id] = {
      proposed: s.proposed,
      passed: s.passed,
      passRate: s.proposed ? Math.round((s.passed / s.proposed) * 100) : null,
      approval: s.approvalTotal ? Math.round((s.approvalYes / s.approvalTotal) * 100) : null,
      cast: s.cast,
      winRate: s.cast ? Math.round((s.alignedWithResult / s.cast) * 100) : null,
    }
  }
  return result
}

function tallyBallots(ballots) {
  let yay = 0, nay = 0
  for (const v of Object.values(ballots ?? {})) { if (v === 'yay') yay++; else if (v === 'nay') nay++ }
  return { yay, nay }
}

function shouldTriggerWorldEvent(tick, lastTick) {
  if (tick < WORLD_EVENT_MIN_INTERVAL || tick - lastTick < WORLD_EVENT_MIN_INTERVAL) return false
  return Math.random() < WORLD_EVENT_PROBABILITY
}

function summarizeCommitments(votes, timeline) {
  const lines = []
  for (const v of votes.filter(v => v.resolved && v.passed).slice(-3)) {
    lines.push(`• Agreed: "${v.text}"${v.arbiterOutcome ? ` — ${v.arbiterOutcome}` : ''}`)
  }
  for (const e of timeline.filter(e => e.kind === 'turn' && e.workOutputs?.length > 0).slice(-3)) {
    for (const wo of e.workOutputs) {
      lines.push(`• ${e.agentName} — ${wo.type}: "${wo.arg}"${wo.outcome ? ` — ${wo.outcome}` : ''}`)
    }
  }
  return lines.join('\n')
}

// Parse all <TYPE: arg> work output tags from agent text.
function parseWorkOutputs(text) {
  const typePattern = Object.keys(WORK_OUTPUT_TYPES).join('|')
  const re = new RegExp(`<(${typePattern})(?::\\s*([^>]*))?\\s*>`, 'gi')
  const results = []
  let m
  while ((m = re.exec(text)) !== null) {
    results.push({ type: m[1].toUpperCase(), arg: (m[2] ?? '').trim() })
  }
  return results
}

function stripWorkOutputTags(text) {
  const typePattern = Object.keys(WORK_OUTPUT_TYPES).join('|')
  return text.replace(new RegExp(`<(?:${typePattern})(?::[^>]*)?>`, 'gi'), '').trim()
}

// Productivity summary: docs created, positive vs negative action consequences.
function computeProductivity(timeline, documents) {
  const docCount = documents.length
  let positive = 0, negative = 0
  for (const ev of timeline) {
    if (ev.kind === 'doc-created') {
      if (ev.consequence === 'positive') positive++
      else if (ev.consequence === 'negative' || ev.consequence === 'mixed') negative++
    }
    for (const wo of ev.workOutputs ?? []) {
      if (wo.consequence === 'positive') positive++
      else if (wo.consequence === 'negative') negative++
    }
  }
  return { docCount, positive, negative }
}

const QUALITY_COLORS = { high: '#6ee7b7', medium: '#ffd43b', low: '#ff6b6b' }
const CONSEQUENCE_COLORS_DOC = { positive: '#6ee7b7', neutral: '#606090', negative: '#ff6b6b', mixed: '#ffd43b' }

function DocumentRegistry({ documents }) {
  const [expanded, setExpanded] = useState(null)

  if (documents.length === 0) {
    return (
      <div style={{ borderTop: '1px solid #14142a', padding: '8px 14px', background: '#080814', flexShrink: 0 }}>
        <div style={{ color: '#2e2e50', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Document Registry</div>
        <div style={{ color: '#2e2e50', fontSize: 11, fontStyle: 'italic' }}>No documents produced yet.</div>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid #14142a', background: '#080814', flexShrink: 0, maxHeight: 180, overflowY: 'auto' }}>
      <div style={{ padding: '8px 14px 4px', position: 'sticky', top: 0, background: '#080814', zIndex: 1 }}>
        <div style={{ color: '#2e2e50', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
          Document Registry — {documents.length} doc{documents.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ padding: '0 14px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {documents.map(doc => {
          const meta = WORK_OUTPUT_TYPES[doc.type] ?? { label: doc.type, color: '#6ee7b7' }
          const isOpen = expanded === doc.id
          return (
            <div key={doc.id}
              onClick={() => setExpanded(isOpen ? null : doc.id)}
              style={{
                background: '#0f0f1e', border: `1px solid ${meta.color}33`, borderRadius: 5,
                padding: '6px 10px', cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = meta.color + '66'}
              onMouseLeave={e => e.currentTarget.style.borderColor = meta.color + '33'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  background: meta.color + '22', border: `1px solid ${meta.color}55`,
                  color: meta.color, padding: '1px 5px', borderRadius: 3, fontWeight: 700, fontSize: 9,
                }}>
                  {meta.label.toUpperCase()}
                </span>
                <span style={{ color: '#ccd0e8', fontSize: 11, fontWeight: 600, flex: 1 }}>{doc.title}</span>
                <span style={{ color: '#606090', fontSize: 10 }}>T{doc.tick} · {doc.creatorName}</span>
                <span style={{ color: QUALITY_COLORS[doc.quality] ?? '#606090', fontSize: 9, fontWeight: 700 }}>{doc.quality}</span>
                <span style={{ color: CONSEQUENCE_COLORS_DOC[doc.consequence] ?? '#606090', fontSize: 9 }}>{doc.consequence}</span>
              </div>
              {isOpen && doc.content && (
                <div style={{ color: '#9090b0', fontSize: 11, lineHeight: 1.6, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${meta.color}22` }}>
                  {doc.content}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SimulationScreen({ config, initialState, onEnd }) {
  const [agents, setAgents] = useState(initialState?.agents ?? config.agents)
  const [worldState, setWorldState] = useState(initialState?.worldState ?? `Mission active. The team has assembled to address: ${config.scenario}`)
  const [timeline, setTimeline] = useState(initialState?.timeline ?? [])
  const [documents, setDocuments] = useState(initialState?.documents ?? [])
  const [tick, setTick] = useState(initialState?.tick ?? 0)
  const [agentIdx, setAgentIdx] = useState(initialState?.agentIdx ?? 0)
  const [votes, setVotes] = useState(initialState?.votes ?? [])
  const [busy, setBusy] = useState(false)
  const [autoRun, setAutoRun] = useState(false)
  const [injectTarget, setInjectTarget] = useState(null)
  const [streamingText, setStreamingText] = useState(null)

  const timelineRef = useRef(null)
  const busyRef = useRef(false)
  const autoRunRef = useRef(false)
  const agentsRef = useRef(agents)
  const worldStateRef = useRef(worldState)
  const timelineRef2 = useRef(timeline)
  const documentsRef = useRef(documents)
  const tickRef = useRef(tick)
  const agentIdxRef = useRef(agentIdx)
  const votesRef = useRef(votes)
  const lastWorldEventTickRef = useRef(initialState?.lastWorldEventTick ?? 0)

  useEffect(() => { busyRef.current = busy }, [busy])
  useEffect(() => { autoRunRef.current = autoRun }, [autoRun])
  useEffect(() => { agentsRef.current = agents }, [agents])
  useEffect(() => { worldStateRef.current = worldState }, [worldState])
  useEffect(() => { timelineRef2.current = timeline }, [timeline])
  useEffect(() => { documentsRef.current = documents }, [documents])
  useEffect(() => { tickRef.current = tick }, [tick])
  useEffect(() => { agentIdxRef.current = agentIdx }, [agentIdx])
  useEffect(() => { votesRef.current = votes }, [votes])

  useEffect(() => {
    if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight
  }, [timeline])

  useEffect(() => {
    const t = setTimeout(() => {
      saveSession({
        config, agents, worldState, timeline, documents, tick, agentIdx, votes,
        lastWorldEventTick: lastWorldEventTickRef.current,
      })
    }, 600)
    return () => clearTimeout(t)
  }, [config, agents, worldState, timeline, documents, tick, agentIdx, votes])

  function endSimulation() {
    if (autoRunRef.current) setAutoRun(false)
    clearSession()
    onEnd?.()
  }

  const client = useRef(createClient(config.ollamaUrl))

  async function runTick() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)

    const currentAgents = agentsRef.current
    const currentWorldState = worldStateRef.current
    const currentTimeline = timelineRef2.current
    const currentDocs = documentsRef.current
    const currentTick = tickRef.current + 1
    const idx = agentIdxRef.current % currentAgents.length
    const agent = currentAgents[idx]

    try {
      let workingWorldState = currentWorldState
      const extraEntries = []

      // ── World event ──
      if (shouldTriggerWorldEvent(currentTick, lastWorldEventTickRef.current)) {
        try {
          const commitments = summarizeCommitments(votesRef.current, currentTimeline)
          const we = await jsonChat(client.current, config.model, worldEventPrompt(config.scenario, workingWorldState, currentTick, commitments))
          if (we?.event) {
            extraEntries.push({
              id: crypto.randomUUID(), kind: 'world-event', tick: currentTick,
              content: we.event, preparedness: we.preparedness ?? null, hint: we.hint ?? null,
            })
            if (we.worldStateUpdate) workingWorldState += `\n• ⏱ ${we.worldStateUpdate}`
            if (we.hint) workingWorldState += `\n• 🔎 Arbiter's read: ${we.hint}`
            lastWorldEventTickRef.current = currentTick
          }
        } catch (_) {}
      }

      // ── Vote context ──
      const openVote = votesRef.current.find(v => !v.resolved) ?? null
      const voteStatus = openVote
        ? { openVote: { proposerName: openVote.proposerName, text: openVote.text, ...tallyBallots(openVote.ballots) }, hasVoted: !!openVote.ballots[agent.id] }
        : { cooldownTicksLeft: Math.max(0, (agent.voteCooldownUntil ?? 0) - currentTick + 1) }

      const recentEvents = currentTimeline.slice(-8)
      const userMsg = agentUserMessage(workingWorldState, recentEvents, voteStatus, currentDocs)
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

      // ── Parse work outputs ──
      const workOutputs = parseWorkOutputs(agentText)
      const docOutputs = workOutputs.filter(wo => WORK_OUTPUT_TYPES[wo.type]?.isDoc)
      const actionOutputs = workOutputs.filter(wo => !WORK_OUTPUT_TYPES[wo.type]?.isDoc)

      // Legacy [ACTION:] fallback
      const legacyActionMatch = agentText.match(/\[ACTION:\s*(.*?)\]/i)
      if (legacyActionMatch && actionOutputs.length === 0) {
        actionOutputs.push({ type: 'DEPLOY RESOURCE', arg: legacyActionMatch[1].trim() })
      }

      const voteCallMatch = !openVote ? agentText.match(/\[VOTE:\s*(.*?)\]/i) : null
      const castsYay = /\[YAY\]/i.test(agentText)
      const castsNay = /\[NAY\]/i.test(agentText)
      const cleanContent = stripWorkOutputTags(agentText)
        .replace(/\[ACTION:.*?\]/gi, '')
        .replace(/\[VOTE:.*?\]/gi, '')
        .replace(/\[YAY\]/gi, '')
        .replace(/\[NAY\]/gi, '')
        .trim()

      // ── Adjudicator: process document-creating outputs ──
      const newDocs = []
      for (const docOutput of docOutputs) {
        try {
          const adj = await jsonChat(
            client.current, config.model,
            adjudicatorPrompt(config.scenario, workingWorldState, agent.name, docOutput.type, docOutput.arg, agentText)
          )
          const doc = {
            id: crypto.randomUUID(), tick: currentTick,
            creatorId: agent.id, creatorName: agent.name,
            type: docOutput.type, title: docOutput.arg || docOutput.type,
            content: adj?.documentContent ?? '',
            quality: adj?.quality ?? 'medium',
            consequence: adj?.consequence ?? 'neutral',
          }
          newDocs.push(doc)
          docOutput.outcome = doc.content.slice(0, 80)
          docOutput.consequence = doc.consequence
          if (adj?.worldStateUpdate) workingWorldState += `\n• 📄 ${adj.worldStateUpdate}`
          extraEntries.push({
            id: crypto.randomUUID(), kind: 'doc-created', tick: currentTick,
            agentId: agent.id, agentName: agent.name,
            docType: docOutput.type, docTitle: doc.title, docId: doc.id,
            quality: doc.quality, consequence: doc.consequence,
          })
        } catch (_) {}
      }

      // ── Arbiter: process the first action-type output ──
      let arbiterOutcome = null, arbiterConsequence = null, worldUpdate = null
      const firstAction = actionOutputs[0]
      if (firstAction) {
        try {
          const j = await jsonChat(
            client.current, config.model,
            arbiterPrompt(config.scenario, workingWorldState, agent.name, `${firstAction.type}: ${firstAction.arg}`)
          )
          arbiterOutcome = j?.outcome ?? null
          arbiterConsequence = j?.consequence ?? null
          worldUpdate = j?.worldStateUpdate ?? null
          firstAction.outcome = arbiterOutcome
          firstAction.consequence = arbiterConsequence
        } catch (_) {}
      }

      // ── Voting ──
      let nextVotes = votesRef.current
      let voteCooldownUntil = agent.voteCooldownUntil

      if (openVote && !openVote.ballots[agent.id] && (castsYay || castsNay)) {
        const ballots = { ...openVote.ballots, [agent.id]: castsYay ? 'yay' : 'nay' }
        const allVoted = currentAgents.every(a => ballots[a.id])
        const ticksOpen = currentTick - openVote.openedAtTick

        if (allVoted || ticksOpen >= currentAgents.length + VOTE_TIMEOUT_EXTRA) {
          const tally = tallyBallots(ballots)
          const passed = tally.yay > tally.nay
          let resOutcome = null, resConsequence = null, resWorldUpdate = null
          try {
            const rj = await jsonChat(client.current, config.model, voteResolutionPrompt(config.scenario, workingWorldState, openVote.text, passed, tally))
            resOutcome = rj?.outcome; resConsequence = rj?.consequence; resWorldUpdate = rj?.worldStateUpdate
          } catch (_) {}
          if (resWorldUpdate) workingWorldState += `\n• 🗳 ${resWorldUpdate}`
          nextVotes = votesRef.current.map(v => v.id !== openVote.id ? v : {
            ...v, ballots, resolved: true, resolvedAtTick: currentTick, tally, passed,
            arbiterOutcome: resOutcome, arbiterConsequence: resConsequence,
          })
          extraEntries.push({
            id: crypto.randomUUID(), kind: 'vote-resolved', tick: currentTick,
            voteText: openVote.text, proposerName: openVote.proposerName,
            tally, passed, arbiterOutcome: resOutcome, arbiterConsequence: resConsequence,
          })
        } else {
          nextVotes = votesRef.current.map(v => v.id !== openVote.id ? v : { ...v, ballots })
        }
      } else if (!openVote && voteCallMatch && (agent.voteCooldownUntil ?? 0) < currentTick) {
        const proposalText = voteCallMatch[1].trim()
        nextVotes = [...votesRef.current, {
          id: crypto.randomUUID(), proposerId: agent.id, proposerName: agent.name,
          text: proposalText, openedAtTick: currentTick, ballots: {}, resolved: false,
        }]
        voteCooldownUntil = currentTick + VOTE_COOLDOWN_TICKS
        extraEntries.push({
          id: crypto.randomUUID(), kind: 'vote-open', tick: currentTick,
          voteText: proposalText, proposerName: agent.name,
        })
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
        kind: 'turn',
        tick: currentTick,
        agentId: agent.id, agentName: agent.name,
        content: cleanContent,
        workOutputs: workOutputs, // all parsed outputs with outcome/consequence filled in
        arbiterOutcome, arbiterConsequence, // from first action output
        assessment,
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
        voteCooldownUntil,
      }))

      if (newDocs.length > 0) setDocuments(prev => [...prev, ...newDocs])
      if (nextVotes !== votesRef.current) setVotes(nextVotes)
      if (worldUpdate) workingWorldState += `\n• ${worldUpdate}`
      if (workingWorldState !== currentWorldState) setWorldState(workingWorldState)
      setTimeline(prev => [...prev, ...extraEntries, newEntry])
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

  useEffect(() => {
    if (!autoRun || busy) return
    const t = setTimeout(() => { if (autoRunRef.current && !busyRef.current) runTick() }, AUTO_RUN_DELAY_MS)
    return () => clearTimeout(t)
  }, [autoRun, busy, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  function injectFlaw(agentId, flaw) {
    if (!flaw) return
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, flaws: [...a.flaws, flaw] } : a))
  }

  const activeAgent = agents[agentIdx % agents.length]
  const voteStats = computeVoteStats(agents, votes)
  const { docCount, positive, negative } = computeProductivity(timeline, documents)

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
        <span style={{ color: '#2e2e50' }}>│</span>
        {/* Productivity tally */}
        <span title="Documents produced by the group" style={{ color: '#4f9eff', fontSize: 11 }}>📄 {docCount}</span>
        <span title="Positive outcomes" style={{ color: '#6ee7b7', fontSize: 11 }}>↑{positive}</span>
        <span title="Negative/mixed outcomes" style={{ color: '#ff6b6b', fontSize: 11 }}>↓{negative}</span>
        <div style={{ flex: 1 }} />
        <ExportMenu
          disabled={timeline.length === 0}
          onExportJSON={() => exportJSON({ scenario: config.scenario, agents, timeline, tick })}
          onExportCSV={() => exportCSV({ agents })}
          onExportMarkdown={() => exportMarkdown({ scenario: config.scenario, agents, timeline, tick })}
        />
        <span style={{ color: '#2e2e50' }}>│</span>
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
        <span style={{ color: '#2e2e50' }}>│</span>
        <button onClick={endSimulation} title="End this simulation and return to setup (clears saved session)" style={{
          background: 'transparent', border: '1px solid #2e2e50', color: '#606090',
          padding: '4px 13px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
        }}>
          ✕ End
        </button>
      </div>

      {/* Open vote banner */}
      {(() => {
        const openVote = votes.find(v => !v.resolved)
        if (!openVote) return null
        const { yay, nay } = tallyBallots(openVote.ballots)
        return (
          <div style={{ background: '#ffd43b10', borderBottom: '1px solid #ffd43b30', padding: '7px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ color: '#ffd43b', fontWeight: 700 }}>🗳 OPEN VOTE</span>
            <span style={{ color: '#ccd0e8' }}>&ldquo;{openVote.text}&rdquo;</span>
            <span style={{ color: '#606090' }}>— {yay} yay / {nay} nay · called by {openVote.proposerName} · since T{openVote.openedAtTick}</span>
          </div>
        )
      })()}

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Timeline */}
        <div ref={timelineRef} style={{ width: 340, minWidth: 280, borderRight: '1px solid #14142a', overflowY: 'auto', padding: 14 }}>
          <div style={{ color: '#2e2e50', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Event Timeline</div>
          {timeline.length === 0 && (
            <div style={{ color: '#404060', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6 }}>Press Step → or Auto-Run to begin.</div>
          )}
          {timeline.map(ev => <TimelineEvent key={ev.id} ev={ev} agents={agents} />)}

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

        {/* Right: agent grid + document registry + world state */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            flex: 1, overflowY: 'auto', padding: 14,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, alignContent: 'start',
          }}>
            {agents.map(a => (
              <AgentCard key={a.id} agent={a} isActive={a.id === activeAgent?.id} voteStats={voteStats[a.id]}
                onInjectFlaw={id => setInjectTarget(agents.find(ag => ag.id === id) ?? null)} />
            ))}
          </div>

          {/* Document registry */}
          <DocumentRegistry documents={documents} />

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
