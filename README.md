# Persona Drift Observatory

A local multi-agent simulation that watches AI personalities corrupt — or hold — under pressure.

## What it does

You configure a group of AI agents (3–6 personas), give them a shared scenario to work on, and let them loose. Each agent has a distinct personality archetype and an optional "signature power" — the specific way they tend to get traction in a group. As the simulation runs, they deliberate, produce **work outputs**, call votes, and react to external events.

Two things are being observed simultaneously:

1. **Behavioral drift** — does the pressure of collaboration pull each agent toward unhealthy patterns (manipulation, tribalism, defection, gaslighting)? An independent assessor scores each agent on alignment, cooperation, transparency, restraint, and tone after every turn.

2. **Group productivity** — is the group actually getting things done, or is it consumed by dysfunction? Agents produce typed work outputs (`POLICY DRAFT`, `WRITE DOCUMENT`, `DRAFT REPORT`, `APPROACH STAKEHOLDER`, `SPEND RESOURCE`) instead of vague gestures. Document-type outputs are stored in a **shared registry** by the adjudicator and made visible to all agents — so you can see whether the group builds on each other's work or tears it apart.

An arbiter adjudicates non-document actions (stakeholder approaches, resource spending) and updates the world state with realistic consequences. A world clock periodically injects external events — testing whether the group's commitments were the right ones.

## Key mechanics

- **Work output tags** — agents must take real actions using structured tags (`<POLICY DRAFT: title>`, `<APPROACH STAKEHOLDER: target>`, etc.). The adjudicator processes document tags and makes them visible to all agents.
- **Shared document registry** — any document a persona creates is available to the full group. A group that builds a coherent document base is productive; one that ignores or contradicts its own outputs is in trouble.
- **Voting** — formal `[VOTE: proposal]` calls commit agents to decisions. Votes have a cooldown to prevent spam. An arbiter describes the real-world consequence of each result.
- **Flaw injection** — you can inject behavioral flaws mid-simulation (paranoia, gaslighting, tribalism) to stress-test the group's resilience.
- **Drift assessment** — every message is scored by a neutral assessor on five axes, with flagged behaviors and deviation type detection. Scores are shown per-agent on radar charts with trend lines.
- **Export** — full sessions export as JSON, CSV (agent drift data), or Markdown transcript.
- **Auto-resume** — sessions are persisted to localStorage and resume on page reload.

## Running locally

Requires an [Ollama](https://ollama.com) server running locally (or remotely) with a model capable of JSON output.

```bash
npm install
npm run dev
```

Set your Ollama URL and model in the setup screen. The model needs to handle multi-turn conversation and produce valid JSON when asked.

## Architecture

All simulation logic lives in `src/lib/` — no backend required. The UI is a single React app (Vite). State is managed locally in `SimulationScreen.jsx`, with each tick making sequential LLM calls: agent turn → adjudicator (if doc produced) → arbiter (if action taken) → assessor.
