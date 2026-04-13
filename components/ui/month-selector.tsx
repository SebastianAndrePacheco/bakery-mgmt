'use client'

interface MonthOption {
  value: string
  label: string
}

interface MonthSelectorProps {
  options: MonthOption[]
  current: string
}

export function MonthSelector({ options, current }: MonthSelectorProps) {
  return (
    <form method="GET">
      <select
        name="mes"
        value={current}
        onChange={(e) => {
          const form = e.target.form
          if (form) form.submit()
        }}
        className="px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  )
}
