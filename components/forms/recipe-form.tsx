'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Supply, Unit } from '@/utils/types/database.types'
import { Plus } from 'lucide-react'
import { createRecipeItem } from '@/app/actions'

interface RecipeFormProps {
  productId: string
  supplies: (Supply & { unit?: Unit })[]
  units: Unit[]
}

export function RecipeForm({ productId, supplies, units }: RecipeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    supply_id: '',
    quantity: '',
    unit_id: '',
    notes: '',
  })

  // Actualizar unidad por defecto cuando se selecciona un insumo
  const handleSupplyChange = (supplyId: string) => {
    const supply = supplies.find(s => s.id === supplyId)
    setFormData({
      ...formData,
      supply_id: supplyId,
      unit_id: supply?.unit_id || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createRecipeItem({
      product_id: productId,
      supply_id: formData.supply_id,
      quantity: parseFloat(formData.quantity),
      unit_id: formData.unit_id,
      notes: formData.notes,
    })

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setFormData({ supply_id: '', quantity: '', unit_id: '', notes: '' })
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Insumo */}
        <div className="md:col-span-5 space-y-2">
          <label className="text-sm font-medium">
            Insumo <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.supply_id}
            onChange={(e) => handleSupplyChange(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar insumo</option>
            {supplies.map((supply) => (
              <option key={supply.id} value={supply.id}>
                {supply.code} - {supply.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cantidad */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">
            Cantidad <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            required
            step="0.001"
            min="0.001"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="0.5"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Unidad */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">
            Unidad <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.unit_id}
            onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Unidad</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Notas */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Notas</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Opcional"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Botón */}
        <div className="md:col-span-1 flex items-end">
          <Button type="submit" disabled={loading} className="w-full">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </form>
  )
}
