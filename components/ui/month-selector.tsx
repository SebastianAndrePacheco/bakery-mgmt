'use client'

interface MonthOption {
  value: string
  label: string
}

export interface MonthSelectorProps {
  options: MonthOption[]
  current: string
  extraParam?: Record<string, string>
}

export function MonthSelector({ options, current, extraParam }: MonthSelectorProps) {
  return (
    <form method="GET">
      {extraParam && Object.entries(extraParam).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
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
