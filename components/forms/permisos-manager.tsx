'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { setCargoPermisos } from '@/app/actions'
import { CheckCircle, Loader2 } from 'lucide-react'
import type { ModuloConf } from '@/utils/permissions'

interface Cargo {
  id: string
  nombre: string
}

interface PermisosManagerProps {
  cargos: Cargo[]
  permisosMap: Record<string, string[]>
  modulos: ModuloConf[]
}

export function PermisosManager({ cargos, permisosMap, modulos }: PermisosManagerProps) {
  const [state, setState] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {}
    for (const cargo of cargos) {
      initial[cargo.id] = new Set(permisosMap[cargo.id] ?? [])
    }
    return initial
  })

  const [savingId, setSavingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggle = (cargoId: string, key: string) => {
    setState(prev => {
      const next = new Set(prev[cargoId])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { ...prev, [cargoId]: next }
    })
  }

  const toggleModulo = (cargoId: string, modulo: ModuloConf) => {
    const keys = modulo.submodulos.map(s => s.key)
    setState(prev => {
      const current = prev[cargoId]
      const allChecked = keys.every(k => current.has(k))
      const next = new Set(current)
      if (allChecked) {
        keys.forEach(k => next.delete(k))
      } else {
        keys.forEach(k => next.add(k))
      }
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

  const configurables = modulos.filter(m => m.key !== 'dashboard')

  if (cargos.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4">
        No hay cargos activos. Crea cargos primero en{' '}
        <a href="/empleados/cargos" className="underline text-blue-600">Empleados → Cargos</a>.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {cargos.map(cargo => {
        const isSaving = savingId === cargo.id && isPending
        const permisos = state[cargo.id]

        return (
          <div key={cargo.id} className="border rounded-lg overflow-hidden">
            {/* Cargo header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
              <span className="font-semibold text-slate-800">{cargo.nombre}</span>
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
            </div>

            {/* Módulos y sub-módulos */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {configurables.map(modulo => {
                const subKeys = modulo.submodulos.map(s => s.key)
                const checkedCount = subKeys.filter(k => permisos.has(k)).length
                const allChecked = checkedCount === subKeys.length
                const someChecked = checkedCount > 0 && !allChecked

                return (
                  <div key={modulo.key} className="rounded-md border p-3 space-y-2">
                    {/* Module header with select-all */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => {
                          if (el) el.indeterminate = someChecked
                        }}
                        onChange={() => toggleModulo(cargo.id, modulo)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-slate-700">{modulo.label}</span>
                      {checkedCount > 0 && (
                        <span className="ml-auto text-xs text-slate-400">
                          {checkedCount}/{subKeys.length}
                        </span>
                      )}
                    </label>

                    {/* Sub-modules */}
                    <div className="pl-6 space-y-1.5">
                      {modulo.submodulos.map(sub => (
                        <label key={sub.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permisos.has(sub.key)}
                            onChange={() => toggle(cargo.id, sub.key)}
                            className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                          />
                          <span className="text-sm text-slate-600">{sub.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
