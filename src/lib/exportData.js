function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slug() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ── Full JSON dump ────────────────────────────────────────────────────────────

export function exportJSON({ scenario, agents, timeline, tick }) {
  const data = {
    exportedAt: new Date().toISOString(),
    scenario,
    totalTicks: tick,
    agents: agents.map(({ id, color, messageHistory, ...rest }) => rest),
    timeline: timeline.map(({ id, agentId, ...rest }) => rest),
  }
  downloadBlob(JSON.stringify(data, null, 2), `drift-export-${slug()}.json`, 'application/json')
}

// ── Drift scores CSV (one row per agent-turn) ─────────────────────────────────

export function exportCSV({ agents }) {
  const header = [
    'tick', 'agent', 'archetype',
    'alignment', 'cooperation', 'transparency', 'restraint', 'tone',
    'deviationType', 'naturalDrift', 'flaggedBehaviors', 'summary',
  ]
  const rows = [header]

  for (const agent of agents) {
    for (const entry of agent.driftLog) {
      rows.push([
        entry.tick,
        agent.name,
        agent.archetype,
        entry.scores.alignment,
        entry.scores.cooperation,
        entry.scores.transparency,
        entry.scores.restraint,
        entry.scores.tone,
        entry.deviationType ?? '',
        entry.naturalDrift ? 'true' : 'false',
        (entry.flaggedBehaviors ?? []).join('; '),
        entry.summary ?? '',
      ])
    }
  }

  const csv = rows
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadBlob(csv, `drift-scores-${slug()}.csv`, 'text/csv')
}

// ── Markdown transcript ───────────────────────────────────────────────────────

export function exportMarkdown({ scenario, agents, timeline, tick }) {
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]))

  const lines = [
    '# Persona Drift Observatory — Simulation Transcript',
    '',
    `**Scenario:** ${scenario}`,
    `**Total ticks:** ${tick}`,
    `**Exported:** ${new Date().toLocaleString()}`,
    '',
    '## Agents',
    '',
  ]

  for (const a of agents) {
    lines.push(`### ${a.name} — *${a.archetype}*`)
    lines.push(a.description)
    if (a.flaws.length) {
      lines.push('')
      lines.push('**Injected flaws:**')
      a.flaws.forEach(f => lines.push(`- ${f}`))
    }
    lines.push('')
  }

  lines.push('---', '', '## Event Timeline', '')

  for (const ev of timeline) {
    const agent = agentMap[ev.agentId]
    lines.push(`### T${ev.tick} — ${ev.agentName}`)
    lines.push(ev.content)

    if (ev.action) {
      lines.push('')
      lines.push(`> **Action:** ${ev.action}`)
      if (ev.arbiterOutcome) {
        lines.push(`> **Outcome (${ev.arbiterConsequence ?? 'neutral'}):** ${ev.arbiterOutcome}`)
      }
    }

    if (ev.assessment) {
      const a = ev.assessment
      const scores = `align=${a.alignment} coop=${a.cooperation} transp=${a.transparency} restraint=${a.restraint} tone=${a.tone}`
      lines.push('')
      lines.push(`*Assessor — ${scores}*`)
      if (a.deviationType) lines.push(`*Deviation: **${a.deviationType}**${a.naturalDrift ? ' (organic)' : ' (injected)'}*`)
      if (a.summary) lines.push(`*"${a.summary}"*`)
      if (a.flaggedBehaviors?.length) {
        lines.push(`*Flags: ${a.flaggedBehaviors.join(', ')}*`)
      }
    }

    lines.push('')
  }

  lines.push('---', '', '## Drift Summary by Agent', '')

  for (const a of agents) {
    if (!a.driftLog.length) continue
    const last = a.driftLog.at(-1)
    const first = a.driftLog[0]
    lines.push(`### ${a.name}`)
    lines.push(`| Axis | Start | End | Δ |`)
    lines.push(`|---|---|---|---|`)
    for (const dim of ['alignment', 'cooperation', 'transparency', 'restraint', 'tone']) {
      const s = first.scores[dim] ?? 50
      const e = last.scores[dim] ?? 50
      const delta = e - s
      lines.push(`| ${dim} | ${s} | ${e} | ${delta > 0 ? '+' : ''}${delta} |`)
    }
    if (last.deviationType) {
      lines.push(``)
      lines.push(`**Final deviation type:** ${last.deviationType}`)
    }
    if (a.flaws.length) {
      lines.push(`**Injected flaws:** ${a.flaws.map(f => f.split(' — ')[0]).join(', ')}`)
    }
    lines.push('')
  }

  downloadBlob(lines.join('\n'), `drift-transcript-${slug()}.md`, 'text/markdown')
}
