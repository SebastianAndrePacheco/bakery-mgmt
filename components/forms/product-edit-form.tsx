'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Product, Category, Unit, TIPO_PRODUCTO_OPTIONS } from '@/utils/types/database.types'
import { Save } from 'lucide-react'
import { updateProduct } from '@/app/actions'

interface ProductEditFormProps {
  product: Product
  categories: Category[]
  units: Unit[]
}

export function ProductEditForm({ product, categories, units }: ProductEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    code: product.code,
    name: product.name,
    category_id: product.category_id,
    unit_id: product.unit_id,
    tipo_producto: product.tipo_producto,
    shelf_life_days: product.shelf_life_days,
    selling_price: product.selling_price?.toString() || '',
    is_active: product.is_active,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await updateProduct(product.id, {
      ...formData,
      selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
    })

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/produccion/productos')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Código */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Código <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="PAN-001"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring uppercase"
          />
        </div>

        {/* Nombre */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Nombre <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Pan Francés"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Tipo de producto */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tipo de producto <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.tipo_producto}
            onChange={(e) => setFormData({ ...formData, tipo_producto: e.target.value as Product['tipo_producto'] })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar tipo</option>
            {TIPO_PRODUCTO_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Categoría <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Unidad */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Unidad de Medida <span className="text-red-600">*</span>
          </label>
          <select
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

        {/* Vida útil */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Vida Útil (días) <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.shelf_life_days}
            onChange={(e) => setFormData({ ...formData, shelf_life_days: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-slate-500">
            Días que dura el producto fresco después de producido
          </p>
        </div>

        {/* Precio de venta */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Precio de Venta (opcional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-600">S/</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
              placeholder="0.00"
              className="w-full pl-10 pr-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4 rounded border-input"
        />
        <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
          Producto activo
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Botones */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
