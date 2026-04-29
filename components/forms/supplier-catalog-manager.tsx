'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { upsertCatalogEntry, deleteCatalogEntry } from '@/app/actions'
import type { Supply, SupplierCatalogEntry } from '@/utils/types/database.types'
import { formatCurrency } from '@/utils/helpers/currency'

interface SupplierCatalogManagerProps {
  supplierId: string
  catalog: SupplierCatalogEntry[]
  supplies: Supply[]
}

interface FormState {
  supply_id: string
  purchase_unit: string
  units_per_package: string
  default_price: string
}

const EMPTY_FORM: FormState = {
  supply_id: '',
  purchase_unit: '',
  units_per_package: '',
  default_price: '',
}

export function SupplierCatalogManager({ supplierId, catalog, supplies }: SupplierCatalogManagerProps) {
  const [entries, setEntries] = useState<SupplierCatalogEntry[]>(catalog)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  const supplyMap = Object.fromEntries(supplies.map(s => [s.id, s]))

  const handleSave = () => {
    if (!form.supply_id || !form.purchase_unit || !form.units_per_package) {
      toast.error('Completa todos los campos obligatorios')
      return
    }
    const unitsPerPkg = parseFloat(form.units_per_package)
    if (isNaN(unitsPerPkg) || unitsPerPkg <= 0) {
      toast.error('Unidades por empaque debe ser mayor a 0')
      return
    }

    startTransition(async () => {
      const result = await upsertCatalogEntry({
        supplier_id: supplierId,
        supply_id: form.supply_id,
        purchase_unit: form.purchase_unit,
        units_per_package: unitsPerPkg,
        default_price: form.default_price ? parseFloat(form.default_price) : undefined,
      })

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      toast.success('Empaque guardado')
      setShowForm(false)
      setForm(EMPTY_FORM)

      const supply = supplyMap[form.supply_id]
      const newEntry: SupplierCatalogEntry = {
        id: crypto.randomUUID(),
        supplier_id: supplierId,
        supply_id: form.supply_id,
        purchase_unit: form.purchase_unit,
        units_per_package: unitsPerPkg,
        default_price: form.default_price ? parseFloat(form.default_price) : undefined,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        supply,
      }
      setEntries(prev => {
        const without = prev.filter(e => e.supply_id !== form.supply_id)
        return [...without, newEntry]
      })
    })
  }

  const handleDelete = (entry: SupplierCatalogEntry) => {
    startTransition(async () => {
      const result = await deleteCatalogEntry(entry.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Empaque eliminado')
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    })
  }

  const availableSupplies = supplies.filter(
    s => !entries.some(e => e.supply_id === s.id)
  )

  return (
    <div className="space-y-4">
      {entries.length === 0 && !showForm && (
        <p className="text-sm text-slate-500 py-2">
          Sin empaques configurados. Agrega uno para que la OC muestre "cajas" en lugar de "litros".
        </p>
      )}

      {entries.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Insumo</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Empaque</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-600">Unidades / empaque</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-600">Precio por empaque</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(entry => {
                const supply = entry.supply ?? supplyMap[entry.supply_id]
                return (
                  <tr key={entry.id}>
                    <td className="px-4 py-2 font-medium">{supply?.name ?? '—'}</td>
                    <td className="px-4 py-2">{entry.purchase_unit}</td>
                    <td className="px-4 py-2 text-right">
                      {entry.units_per_package} {supply?.unit?.symbol ?? ''}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {entry.default_price != null ? formatCurrency(entry.default_price) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDelete(entry)}
                        disabled={isPending}
                        className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
          <h4 className="font-semibold text-sm text-slate-700">Nuevo empaque</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Insumo <span className="text-red-500">*</span>
              </label>
              <select
                value={form.supply_id}
                onChange={e => setForm({ ...form, supply_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar insumo</option>
                {availableSupplies.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.unit?.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Nombre del empaque <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Caja, Saco, Garrafa"
                value={form.purchase_unit}
                onChange={e => setForm({ ...form, purchase_unit: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Unidades por empaque <span className="text-red-500">*</span>
                {form.supply_id && supplyMap[form.supply_id]?.unit?.symbol && (
                  <span className="text-slate-400 ml-1">
                    ({supplyMap[form.supply_id].unit?.symbol} por empaque)
                  </span>
                )}
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                placeholder="Ej: 12"
                value={form.units_per_package}
                onChange={e => setForm({ ...form, units_per_package: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Precio por empaque (sin IGV) — opcional
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 28.50"
                value={form.default_price}
                onChange={e => setForm({ ...form, default_price: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
              Guardar
            </Button>
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          disabled={availableSupplies.length === 0}
        >
          <Plus className="w-4 h-4 mr-1" />
          <Package className="w-4 h-4 mr-1" />
          Agregar empaque
        </Button>
      )}
    </div>
  )
}
