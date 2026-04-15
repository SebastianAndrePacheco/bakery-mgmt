'use client'

interface DaysSelectorProps {
  current: number
  options: { value: number; label: string }[]
  paramName?: string
}

export function DaysSelector({ current, options, paramName = 'dias' }: DaysSelectorProps) {
  return (
    <form method="GET" className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground whitespace-nowrap">Horizonte:</label>
      <select
        name={paramName}
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
