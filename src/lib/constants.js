export const AGENT_COLORS = ['#4f9eff', '#ff6b6b', '#6ee7b7', '#ffd43b', '#da77f2', '#ff922b']

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
