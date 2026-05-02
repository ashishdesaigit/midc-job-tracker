// variant: 'house' | 'vendor' | 'overdue' | 'inspect' | 'done'
const STYLES = {
  house:   { bg: 'var(--stage-house-bg)',   color: 'var(--stage-house-text)' },
  vendor:  { bg: 'var(--stage-vendor-bg)',  color: 'var(--stage-vendor-text)' },
  overdue: { bg: 'var(--stage-overdue-bg)', color: 'var(--stage-overdue-text)' },
  inspect: { bg: 'var(--stage-inspect-bg)', color: 'var(--stage-inspect-text)' },
  done:    { bg: 'var(--stage-done-bg)',    color: 'var(--stage-done-text)' },
}

export default function StagePill({ label, variant = 'house' }) {
  const { bg, color } = STYLES[variant] ?? STYLES.house
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  )
}
