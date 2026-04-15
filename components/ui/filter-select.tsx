'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface FilterSelectProps {
  paramName: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function FilterSelect({ paramName, options, placeholder }: FilterSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const current = searchParams.get(paramName) ?? ''

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (value) {
      params.set(paramName, value)
    } else {
      params.delete(paramName)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
