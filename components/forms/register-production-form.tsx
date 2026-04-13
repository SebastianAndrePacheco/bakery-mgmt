'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Factory, AlertCircle } from 'lucide-react'

interface RegisterProductionFormProps {
  order: any
  ingredients: any[]
  canProduce: boolean
}

export function RegisterProductionForm({ order, ingredients, canProduce }: RegisterProductionFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    production_date: new Date().toISOString().split('T')[0],
    quantity_produced: order.quantity_planned.toString(),
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canProduce) {
      alert('❌ No puedes producir porque faltan insumos')
      return
    }

    const confirm = window.confirm(
      `¿Confirmar producción de ${formData.quantity_produced} ${order.product.unit.symbol} de ${order.product.name}?\n\n` +
      `Esto consumirá los insumos automáticamente usando FIFO (primero los lotes más viejos).`
    )

    if (!confirm) return

    setLoading(true)

    try {
      // Llamada atómica: FIFO + lote de producto + kardex + estado de orden
      // El costo real se calcula dentro de la función con los lotes FIFO consumidos
      const { data, error } = await supabase.rpc('complete_production_order', {
        p_order_id:          order.id,
        p_quantity_produced: parseFloat(formData.quantity_produced),
        p_production_date:   formData.production_date,
        p_notes:             formData.notes || '',
      })

      if (error) throw error

      const result = data as {
        batch_code: string
        quantity_produced: number
        total_cost: number
        unit_cost: number
        expiration_date: string
      }

      const expirationFormatted = new Date(result.expiration_date + 'T00:00:00')
        .toLocaleDateString('es-PE')

      alert(
        `✅ Producción registrada exitosamente!\n\n` +
        `Producto: ${order.product.name}\n` +
        `Cantidad: ${result.quantity_produced} ${order.product.unit.symbol}\n` +
        `Lote: ${result.batch_code}\n` +
        `Costo Total: S/ ${Number(result.total_cost).toFixed(2)}\n` +
        `Vence: ${expirationFormatted}`
      )

      router.push('/produccion/ordenes')
      router.refresh()

    } catch (error: any) {
      console.error('Error al registrar producción:', error)
      alert('❌ Error al registrar producción: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!canProduce && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">❌ No se puede producir</h3>
              <p className="text-sm text-red-700">
                Faltan insumos. Debes recibir más stock antes de producir.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Fecha de Producción <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.production_date}
            onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Cantidad Producida <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              max={order.quantity_planned}
              value={formData.quantity_produced}
              onChange={(e) => setFormData({ ...formData, quantity_produced: e.target.value })}
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="px-3 py-2 bg-slate-100 rounded-md text-sm font-medium">
              {order.product.unit.symbol}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Máximo: {order.quantity_planned} {order.product.unit.symbol}
          </p>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Notas (opcional)</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Observaciones sobre esta producción"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Al confirmar se ejecutará:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✓ Consumo de insumos con FIFO (primero lotes más viejos)</li>
          <li>✓ Actualización de stock de insumos</li>
          <li>✓ Creación de lote de producto terminado</li>
          <li>✓ Registro en Kardex (salidas de insumos + entrada de producto)</li>
          <li>✓ Cálculo automático de costo de producción</li>
          <li>✓ Fecha de vencimiento: {order.product.shelf_life_days} días desde hoy</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={loading || !canProduce} 
          className="flex-1"
        >
          <Factory className="w-4 h-4 mr-2" />
          {loading ? 'Registrando...' : 'Confirmar y Ejecutar Producción'}
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
