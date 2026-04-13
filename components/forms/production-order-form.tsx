'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Product, Unit } from '@/utils/types/database.types'
import { Factory, AlertCircle } from 'lucide-react'
import { createProductionOrder } from '@/app/actions'

interface ProductWithUnit extends Product {
  unit?: Unit
}

interface ProductionOrderFormProps {
  products: ProductWithUnit[]
}

export function ProductionOrderForm({ products }: ProductionOrderFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithUnit | null>(null)
  const [recipeItems, setRecipeItems] = useState<any[]>([])
  const [stockWarnings, setStockWarnings] = useState<any[]>([])

  const [formData, setFormData] = useState({
    product_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    production_date: new Date().toISOString().split('T')[0],
    quantity_planned: '',
    order_type: 'programada',
    notes: '',
  })

  useEffect(() => {
    if (formData.product_id) {
      loadRecipe(formData.product_id)
    }
  }, [formData.product_id])

  useEffect(() => {
    if (formData.quantity_planned && recipeItems.length > 0) {
      checkStock()
    }
  }, [formData.quantity_planned, recipeItems])

  const loadRecipe = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)

    const { data: recipe } = await supabase
      .from('product_recipes')
      .select(`
        *,
        supply:supplies(id, code, name, unit:units(symbol)),
        unit:units(symbol)
      `)
      .eq('product_id', productId)

    setRecipeItems(recipe || [])
  }

  const checkStock = async () => {
    const quantity = parseFloat(formData.quantity_planned)
    if (!quantity || recipeItems.length === 0) return

    const warnings = []

    for (const item of recipeItems) {
      const needed = item.quantity * quantity

      const { data: batches } = await supabase
        .from('supply_batches')
        .select('current_quantity')
        .eq('supply_id', item.supply.id)
        .eq('status', 'disponible')

      const available = batches?.reduce((sum, b) => sum + b.current_quantity, 0) || 0

      if (available < needed) {
        warnings.push({
          supply: item.supply.name,
          needed: needed.toFixed(3),
          available: available.toFixed(3),
          unit: item.unit.symbol,
          shortage: (needed - available).toFixed(3)
        })
      }
    }

    setStockWarnings(warnings)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (stockWarnings.length > 0) {
      const confirm = window.confirm(
        `⚠️ ADVERTENCIA: Faltan insumos para esta producción.\n\n` +
        stockWarnings.map(w => `${w.supply}: Faltan ${w.shortage} ${w.unit}`).join('\n') +
        `\n\n¿Deseas crear la orden de todos modos?`
      )
      if (!confirm) return
    }

    setLoading(true)
    setError(null)

    const result = await createProductionOrder({
      product_id: formData.product_id,
      scheduled_date: formData.scheduled_date,
      quantity_planned: parseFloat(formData.quantity_planned),
      order_type: formData.order_type,
      notes: formData.notes,
    })

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/produccion/ordenes')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Producto <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.product_id}
            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.code} - {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tipo de Orden <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.order_type}
            onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="programada">Programada</option>
            <option value="especial">Especial</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Fecha Programada <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.scheduled_date}
            onChange={(e) => setFormData({ 
              ...formData, 
              scheduled_date: e.target.value,
              production_date: e.target.value 
            })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Cantidad a Producir <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              value={formData.quantity_planned}
              onChange={(e) => setFormData({ ...formData, quantity_planned: e.target.value })}
              placeholder="5"
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {selectedProduct && (
              <div className="px-3 py-2 bg-slate-100 rounded-md text-sm font-medium text-slate-700">
                {selectedProduct.unit?.symbol}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Notas (opcional)</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Observaciones adicionales"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {recipeItems.length > 0 && formData.quantity_planned && (
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-3">
            Insumos Necesarios para {formData.quantity_planned} {selectedProduct?.unit?.symbol}:
          </h3>
          <div className="space-y-2">
            {recipeItems.map((item) => {
              const needed = item.quantity * parseFloat(formData.quantity_planned)
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-purple-700">{item.supply.name}:</span>
                  <span className="font-semibold text-purple-900">
                    {needed.toFixed(3)} {item.unit.symbol}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {stockWarnings.length > 0 && (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                ⚠️ Stock Insuficiente
              </h3>
              <div className="space-y-1 text-sm">
                {stockWarnings.map((warning, index) => (
                  <div key={index} className="text-amber-700">
                    <strong>{warning.supply}:</strong> Necesitas {warning.needed} {warning.unit}, 
                    solo tienes {warning.available} {warning.unit} 
                    (faltan {warning.shortage} {warning.unit})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={loading || products.length === 0}
          className="flex-1"
        >
          <Factory className="w-4 h-4 mr-2" />
          {loading ? 'Creando...' : 'Crear Orden de Producción'}
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
