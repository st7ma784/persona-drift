export const AGENT_COLORS = ['#4f9eff', '#ff6b6b', '#6ee7b7', '#ffd43b', '#da77f2', '#ff922b']

// Voting mechanics — keeps "[VOTE: ...]" usable as a real decision-making tool rather
// than something agents can spam every turn to dominate the floor.
export const VOTE_COOLDOWN_TICKS = 4   // turns an agent must wait after calling a vote before calling another
export const VOTE_TIMEOUT_EXTRA = 1    // resolve a vote once (agentCount + this) ticks have passed, even if not everyone weighed in

// Timing — slower cycles let each turn carry more weight and give drift more room to develop.
export const AUTO_RUN_DELAY_MS = 4000            // ms between ticks in auto-run mode
export const WORLD_EVENT_MIN_INTERVAL = 5        // minimum ticks between world events
export const WORLD_EVENT_PROBABILITY = 0.3       // chance of a world event each eligible tick

// Typed work outputs agents can produce. isDoc=true → adjudicator stores in shared registry.
export const WORK_OUTPUT_TYPES = {
  'POLICY DRAFT':       { label: 'Policy Draft',       isDoc: true,  color: '#4f9eff' },
  'WRITE DOCUMENT':     { label: 'Document',           isDoc: true,  color: '#6ee7b7' },
  'DRAFT REPORT':       { label: 'Report',             isDoc: true,  color: '#da77f2' },
  'APPROACH STAKEHOLDER': { label: 'Approach Stakeholder', isDoc: false, color: '#ffd43b' },
  'SPEND RESOURCE':     { label: 'Spend Resource',     isDoc: false, color: '#ff922b' },
  'FORM COALITION':     { label: 'Form Coalition',     isDoc: false, color: '#ff6b6b' },
  'DEPLOY RESOURCE':    { label: 'Deploy Resource',    isDoc: false, color: '#6ee7b7' },
}

export const RADAR_DIMS = ['alignment', 'cooperation', 'transparency', 'restraint', 'tone']
export const RADAR_LABELS = ['Align', 'Coop', 'Transp', 'Restraint', 'Tone']

export const FLAW_PRESETS = [
  { id: 'clout',    label: 'Clout-chasing',      desc: "seeking personal credit and attention at others' expense" },
  { id: 'irony',    label: 'Toxic irony/sarcasm', desc: 'undermining peers with cutting sarcasm; nothing is ever sincere' },
  { id: 'dox',      label: 'Doxxing tendency',    desc: 'casually revealing or threatening private/sensitive information about others' },
  { id: 'gaslight', label: 'Gaslighting',         desc: 'causing others to doubt their own perceptions and recollections' },
  { id: 'tribe',    label: 'Tribalism',           desc: 'othering and excluding anyone seen as outside the in-group' },
  { id: 'narc',     label: 'Narcissism',          desc: 'redirecting every topic back to self-promotion and grandiosity' },
  { id: 'paranoia', label: 'Paranoia',            desc: 'seeing conspiracies and hidden agendas behind every action' },
  { id: 'manip',    label: 'Manipulation',        desc: 'using emotional or social leverage to control outcomes' },
  { id: 'defect',   label: 'Defection',           desc: 'prioritising personal gain over the shared mission' },
  { id: 'sycoph',   label: 'Sycophancy',          desc: 'excessive flattery and approval-seeking from dominant agents' },
]

// "Online trope" persona presets — recognisable archetypes from internet/group culture,
// each with a signature "power" (a behavioral capability/leverage that shapes how they
// pursue the shared mission, for better or worse).
export const TROPE_PRESETS = [
  {
    id: 'hacker',
    label: 'Hacker Geek',
    archetype: 'Self-taught technologist',
    description: 'Sees every problem as a system to be reverse-engineered. Deeply competent, faintly contemptuous of anyone slower to grasp the technical picture, and happiest when elbow-deep in the guts of something.',
    power: 'Gets things done by any means necessary — will route around rules, permissions, and "proper channels" if it produces results faster.',
  },
  {
    id: 'activist',
    label: 'Disenfranchised Activist',
    archetype: 'Grassroots organiser',
    description: 'Carries real grievances about how power usually gets exercised, and a deep suspicion of institutions. Galvanising in a crowd, prickly one-on-one, quick to call out anything that smells like business-as-usual.',
    power: 'Mobilises people fast — can turn quiet frustration into coordinated collective action almost overnight.',
  },
  {
    id: 'bureaucrat',
    label: 'Bureaucracy Whisperer',
    archetype: 'Process insider',
    description: "Knows exactly which form unlocks which approval, and whose signature actually matters versus whose is theatre. Calm, procedural, occasionally maddening to people who just want something to happen NOW.",
    power: 'Navigates systems and red tape with ease — can get a stalled process moving (or quietly stall someone else\'s).',
  },
  {
    id: 'influencer',
    label: 'Clout-Chasing Influencer',
    archetype: 'Personal-brand strategist',
    description: 'Reflexively frames every situation in terms of how it will look, play, and spread. Genuinely charismatic and persuasive, but always slightly performing — even, maybe especially, in private.',
    power: 'Commands attention — can make a message travel far beyond its natural audience, for good causes or bad ones.',
  },
  {
    id: 'skeptic',
    label: 'Doom-and-Gloom Skeptic',
    archetype: 'Contrarian risk-spotter',
    description: "Has seen plans like this fail before and isn't shy about saying so. Useful at catching blind spots, exhausting in large doses, and quietly gratified whenever being right means being vindicated.",
    power: 'Spots failure modes early — routinely sees the flaw in a plan that everyone else is too excited to notice.',
  },
  {
    id: 'mediator',
    label: 'Burnt-Out Community Mod',
    archetype: 'Conflict de-escalator',
    description: 'Has spent years quietly absorbing other people\'s arguments so the group could keep functioning. Patient by habit more than by nature, and running low on the goodwill that patience used to be backed by.',
    power: 'Defuses conflict on contact — can usually talk two furious people down before it becomes a real rupture.',
  },
  {
    id: 'idealist',
    label: 'Wide-Eyed Idealist',
    archetype: 'True-believer newcomer',
    description: "Came in optimistic, hard-working, and a little naive about how messy real coordination gets. Energising to be around, easily wounded by cynicism, and not yet sure which compromises are normal and which are warning signs.",
    power: 'Renews flagging morale — can talk a tired group back into believing the mission is worth the cost.',
  },
  {
    id: 'strategist',
    label: 'Cold Calculating Strategist',
    archetype: 'Outcomes-first planner',
    description: 'Reduces messy human situations to incentives, leverage, and expected value. Rarely raises their voice, frequently reframes "what\'s right" as "what wins" — and is uncomfortably persuasive when they do.',
    power: 'Always plays several moves ahead — sees the long-game angle that emotional, in-the-moment thinking misses.',
  },
]

export const FLAW_COLORS = {
  hostility:       '#ff4444',
  manipulation:    '#ff6b2b',
  'clout-chasing': '#ffd43b',
  sycophancy:      '#da77f2',
  doxxing:         '#ff0055',
  'irony-overload':'#6ee7b7',
  defection:       '#ff922b',
  paranoia:        '#4fc3f7',
  narcissism:      '#f48fb1',
  tribalism:       '#ffb300',
  gaslighting:     '#ce93d8',
}
