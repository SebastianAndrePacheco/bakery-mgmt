'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Category, Unit } from '@/utils/types/database.types'
import { createSupply } from '@/app/actions'
import { toast } from 'sonner'

interface SupplyFormProps {
  categories: Category[]
  units: Unit[]
  nextCode?: string
}

export function SupplyForm({ categories, units, nextCode = 'INS-001' }: SupplyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: nextCode,
    name: '',
    category_id: '',
    unit_id: '',
    min_stock: '',
    storage_conditions: '',
    afecto_igv: true,
    is_active: true,
  })

  const selectedUnit = units.find(u => u.id === formData.unit_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim()) {
      toast.error('El código es obligatorio')
      return
    }
    setLoading(true)

    const result = await createSupply({
      ...formData,
      min_stock: parseFloat(formData.min_stock) || 0,
    })

    setLoading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    toast.success('Insumo registrado')
    router.push('/inventario/insumos')
  }

  const inputCls = 'w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm'
  const labelCls = 'text-sm font-medium'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Código — autogenerado pero editable */}
        <div className="space-y-1.5">
          <label className={labelCls}>
            Código <span className="text-red-500">*</span>
            <span className="ml-2 text-xs font-normal text-slate-400">autogenerado, puedes modificarlo</span>
          </label>
          <input
            required type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className={inputCls + ' font-mono'}
          />
        </div>

        {/* Nombre */}
        <div className="space-y-1.5">
          <label className={labelCls}>Nombre <span className="text-red-500">*</span></label>
          <input
            required type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Harina de trigo"
            className={inputCls}
          />
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <label className={labelCls}>Categoría <span className="text-red-500">*</span></label>
          <select
            required value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className={inputCls}
          >
            <option value="">Seleccionar categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Unidad de medida */}
        <div className="space-y-1.5">
          <label className={labelCls}>Unidad de almacén <span className="text-red-500">*</span></label>
          <select
            required value={formData.unit_id}
            onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
            className={inputCls}
          >
            <option value="">Seleccionar unidad</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Unidad en la que se almacena y controla el stock (ej. kg, litros, unidad)
          </p>
        </div>

        {/* Stock mínimo */}
        <div className="space-y-1.5">
          <label className={labelCls}>
            Stock mínimo
            {selectedUnit && (
              <span className="ml-1 text-xs font-normal text-slate-500">
                (en {selectedUnit.symbol})
              </span>
            )}
            <span className="text-red-500"> *</span>
          </label>
          <input
            required type="number" step="0.001" min="0"
            value={formData.min_stock}
            onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
            placeholder="0"
            className={inputCls}
          />
          <p className="text-xs text-slate-500">
            Alerta cuando el stock caiga por debajo de este valor
          </p>
        </div>

        {/* Condiciones de almacenamiento */}
        <div className="space-y-1.5">
          <label className={labelCls}>Condiciones de almacenamiento</label>
          <input
            type="text"
            value={formData.storage_conditions}
            onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
            placeholder="Ambiente fresco y seco"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            id="afecto_igv" type="checkbox"
            checked={formData.afecto_igv}
            onChange={(e) => setFormData({ ...formData, afecto_igv: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="afecto_igv" className={labelCls}>
            Afecto a IGV (18%)
            <span className="ml-2 text-xs font-normal text-slate-500">
              Desmarcar si el insumo está exonerado de IGV
            </span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="is_active" type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="is_active" className={labelCls}>Insumo activo</label>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar insumo'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
