'use client'

import { Search, X } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

interface SearchInputProps {
  placeholder?: string
  paramName?: string
}

export function SearchInput({ placeholder = 'Buscar...', paramName = 'q' }: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const value = searchParams.get(paramName) ?? ''

  const updateSearch = useCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set(paramName, term)
    } else {
      params.delete(paramName)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }, [router, pathname, searchParams, paramName])

  return (
    <div className="relative">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isPending ? 'text-amber-500' : 'text-slate-400'}`} />
      <input
        type="text"
        value={value}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow"
      />
      {value && (
        <button
          onClick={() => updateSearch('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
