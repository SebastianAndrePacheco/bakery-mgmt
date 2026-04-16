'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { setCargoPermisos } from '@/app/actions'
import { CheckCircle, Loader2 } from 'lucide-react'

interface Cargo {
  id: string
  nombre: string
}

interface PermisosManagerProps {
  cargos: Cargo[]
  permisosMap: Record<string, string[]>
  modulos: Record<string, string>
}

export function PermisosManager({ cargos, permisosMap, modulos }: PermisosManagerProps) {
  // Estado local: cargo_id → Set de módulos activos
  const [state, setState] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {}
    for (const cargo of cargos) {
      initial[cargo.id] = new Set(permisosMap[cargo.id] ?? [])
    }
    return initial
  })

  const [savingId, setSavingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggle = (cargoId: string, modulo: string) => {
    setState(prev => {
      const next = new Set(prev[cargoId])
      if (next.has(modulo)) next.delete(modulo)
      else next.add(modulo)
      return { ...prev, [cargoId]: next }
    })
  }

  const save = (cargoId: string) => {
    setSavingId(cargoId)
    startTransition(async () => {
      const result = await setCargoPermisos(cargoId, [...state[cargoId]])
      setSavingId(null)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Permisos guardados')
      }
    })
  }

  const moduloKeys = Object.keys(modulos).filter(m => m !== 'dashboard')

  if (cargos.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4">
        No hay cargos activos. Crea cargos primero en{' '}
        <a href="/empleados/cargos" className="underline text-blue-600">Empleados → Cargos</a>.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 pr-6 font-semibold text-slate-700 w-48">Cargo</th>
            {/* Dashboard siempre activo — columna informativa */}
            <th className="text-center py-3 px-4 font-semibold text-slate-400 text-xs w-28">
              Dashboard
              <div className="text-xs font-normal text-slate-400">(siempre)</div>
            </th>
            {moduloKeys.map(m => (
              <th key={m} className="text-center py-3 px-4 font-semibold text-slate-700 w-28">
                {modulos[m]}
              </th>
            ))}
            <th className="w-28"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cargos.map(cargo => {
            const isSaving = savingId === cargo.id && isPending
            return (
              <tr key={cargo.id} className="hover:bg-slate-50">
                <td className="py-4 pr-6 font-medium text-slate-800">{cargo.nombre}</td>

                {/* Dashboard — siempre marcado, no editable */}
                <td className="py-4 px-4 text-center">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="w-4 h-4 accent-amber-500 opacity-50 cursor-not-allowed"
                  />
                </td>

                {moduloKeys.map(m => (
                  <td key={m} className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={state[cargo.id]?.has(m) ?? false}
                      onChange={() => toggle(cargo.id, m)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </td>
                ))}

                <td className="py-4 pl-4">
                  <button
                    onClick={() => save(cargo.id)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Guardar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
