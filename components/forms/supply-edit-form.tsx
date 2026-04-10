'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Category, Unit, Supply } from '@/utils/types/database.types'

interface SupplyEditFormProps {
  supply: Supply
  categories: Category[]
  units: Unit[]
}

export function SupplyEditForm({ supply, categories, units }: SupplyEditFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: supply.code,
    name: supply.name,
    category_id: supply.category_id,
    unit_id: supply.unit_id,
    min_stock: supply.min_stock,
    storage_conditions: supply.storage_conditions || '',
    is_active: supply.is_active,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('supplies')
        .update(formData)
        .eq('id', supply.id)

      if (error) throw error

      router.push('/inventario/insumos')
      router.refresh()
    } catch (error: any) {
      alert('Error al actualizar insumo: ' + error.message)
    } finally {
      setLoading(false)
    }
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

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Actualizar Insumo'}
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
