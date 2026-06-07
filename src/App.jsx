import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import SimulationScreen from './components/SimulationScreen'

export default function App() {
  const [config, setConfig] = useState(null)
  return config
    ? <SimulationScreen config={config} />
    : <SetupScreen onStart={setConfig} />
}
