'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Category, Unit } from '@/utils/types/database.types'
import { createSupply } from '@/app/actions'

interface SupplyFormProps {
  categories: Category[]
  units: Unit[]
}

export function SupplyForm({ categories, units }: SupplyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    unit_id: '',
    min_stock: 0,
    storage_conditions: '',
    is_active: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createSupply(formData)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/inventario/insumos')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium">
            Código <span className="text-destructive">*</span>
          </label>
          <input
            id="code"
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="INS-001"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Nombre <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Harina de trigo"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category_id" className="text-sm font-medium">
            Categoría <span className="text-destructive">*</span>
          </label>
          <select
            id="category_id"
            required
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="unit_id" className="text-sm font-medium">
            Unidad de Medida <span className="text-destructive">*</span>
          </label>
          <select
            id="unit_id"
            required
            value={formData.unit_id}
            onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar unidad</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="min_stock" className="text-sm font-medium">
            Stock Mínimo <span className="text-destructive">*</span>
          </label>
          <input
            id="min_stock"
            type="number"
            step="0.001"
            min="0"
            required
            value={formData.min_stock}
            onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="storage_conditions" className="text-sm font-medium">
            Condiciones de Almacenamiento
          </label>
          <input
            id="storage_conditions"
            type="text"
            value={formData.storage_conditions}
            onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
            placeholder="Ambiente fresco y seco"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4 rounded border-input"
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Insumo activo
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Insumo'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
