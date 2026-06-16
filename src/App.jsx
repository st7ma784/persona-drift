import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import SimulationScreen from './components/SimulationScreen'
import { loadSession, clearSession } from './lib/persist'

export default function App() {
  // On first load, try to resume a previously-running simulation from localStorage
  // so switching tabs / reloading / coming back later doesn't wipe the transcript.
  const [resumed] = useState(() => loadSession())
  const [config, setConfig] = useState(() => resumed?.config ?? null)
  const [initialState] = useState(() => resumed)

  function startNew(cfg) {
    clearSession()
    setConfig(cfg)
  }

  function endSimulation() {
    clearSession()
    setConfig(null)
  }

  // Only hand the resumed snapshot to SimulationScreen if `config` is still the
  // resumed one (reference-equal) — i.e. we haven't started a fresh simulation since.
  const resumeData = initialState?.config === config ? initialState : null

  return config
    ? <SimulationScreen config={config} initialState={resumeData} onEnd={endSimulation} />
    : <SetupScreen onStart={startNew} />
}
