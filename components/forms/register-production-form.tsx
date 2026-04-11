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
      `🏭 ¿Confirmar producción de ${formData.quantity_produced} ${order.product.unit.symbol} de ${order.product.name}?\n\n` +
      `Esto consumirá los insumos automáticamente usando FIFO (primero los lotes más viejos).`
    )

    if (!confirm) return

    setLoading(true)

    try {
      const quantityProduced = parseFloat(formData.quantity_produced)

      // 1. CONSUMIR INSUMOS CON FIFO
      for (const ingredient of ingredients) {
        const quantityNeeded = ingredient.quantity * quantityProduced

        // Obtener lotes disponibles ordenados por FIFO (fecha vencimiento, luego fecha recepción)
        const { data: batches } = await supabase
          .from('supply_batches')
          .select('*')
          .eq('supply_id', ingredient.supply.id)
          .eq('status', 'disponible')
          .gt('current_quantity', 0)
          .order('expiration_date', { ascending: true, nullsFirst: false })
          .order('received_date', { ascending: true })

        if (!batches || batches.length === 0) {
          throw new Error(`No hay lotes disponibles de ${ingredient.supply.name}`)
        }

        let remaining = quantityNeeded
        const batchConsumptions = []

        // Consumir de los lotes en orden FIFO
        for (const batch of batches) {
          if (remaining <= 0) break

          const toConsume = Math.min(remaining, batch.current_quantity)
          const newQuantity = batch.current_quantity - toConsume

          // Actualizar el lote
          const { error: batchError } = await supabase
            .from('supply_batches')
            .update({
              current_quantity: newQuantity,
              status: newQuantity === 0 ? 'agotado' : 'disponible'
            })
            .eq('id', batch.id)

          if (batchError) throw batchError

          batchConsumptions.push({
            batch_id: batch.id,
            batch_code: batch.batch_code,
            consumed: toConsume,
            unit_cost: batch.unit_price
          })

          remaining -= toConsume
        }

        if (remaining > 0) {
          throw new Error(`Stock insuficiente de ${ingredient.supply.name}. Faltan ${remaining.toFixed(3)} ${ingredient.unit.symbol}`)
        }

        // Registrar movimientos en kardex por cada lote consumido
        for (const consumption of batchConsumptions) {
          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert([{
              movement_type: 'salida',
              movement_reason: 'produccion',
              entity_type: 'insumo',
              entity_id: ingredient.supply.id,
              batch_id: consumption.batch_id,
              quantity: consumption.consumed,
              unit_id: ingredient.unit_id,
              unit_cost: consumption.unit_cost,
              total_cost: consumption.consumed * consumption.unit_cost,
              reference_type: 'production_order',
              reference_id: order.id,
              notes: `Consumo FIFO para producción ${order.order_number} - Lote ${consumption.batch_code}`,
              movement_date: formData.production_date,
            }])

          if (movementError) throw movementError
        }
      }

      // 2. CREAR LOTE DE PRODUCTO TERMINADO
      const productBatchCode = `${order.product.code}-${Date.now()}`
      const productionDate = new Date(formData.production_date)
      const expirationDate = new Date(productionDate)
      expirationDate.setDate(expirationDate.getDate() + order.product.shelf_life_days)

      // Calcular costo de producción (suma de costos de insumos consumidos)
      let totalProductionCost = 0
      for (const ingredient of ingredients) {
        const quantityNeeded = ingredient.quantity * quantityProduced
        const { data: batches } = await supabase
          .from('supply_batches')
          .select('unit_price')
          .eq('supply_id', ingredient.supply.id)
          .eq('status', 'disponible')
          .order('received_date', { ascending: true })
          .limit(1)

        const avgCost = batches?.[0]?.unit_price || 0
        totalProductionCost += quantityNeeded * avgCost
      }

      const unitCost = totalProductionCost / quantityProduced

      const { data: productBatch, error: productBatchError } = await supabase
        .from('production_batches')
        .insert([{
          production_order_id: order.id,
          product_id: order.product_id,
          batch_code: productBatchCode,
          quantity_produced: quantityProduced,
          current_quantity: quantityProduced,
          production_date: formData.production_date,
          expiration_date: expirationDate.toISOString().split('T')[0],
          unit_cost: unitCost,
          total_cost: totalProductionCost,
          status: 'disponible',
        }])
        .select()
        .single()

      if (productBatchError) throw productBatchError

      // 3. REGISTRAR MOVIMIENTO DE ENTRADA DEL PRODUCTO
      const { error: productMovementError } = await supabase
        .from('inventory_movements')
        .insert([{
          movement_type: 'entrada',
          movement_reason: 'produccion',
          entity_type: 'producto',
          entity_id: order.product_id,
          quantity: quantityProduced,
          unit_id: order.product.unit.id,
          unit_cost: unitCost,
          total_cost: totalProductionCost,
          reference_type: 'production_order',
          reference_id: order.id,
          notes: `Producción completada - Orden ${order.order_number} - Lote ${productBatchCode}`,
          movement_date: formData.production_date,
        }])

      if (productMovementError) throw productMovementError

      // 4. ACTUALIZAR ESTADO DE LA ORDEN
      const { error: orderError } = await supabase
        .from('production_orders')
        .update({
          status: 'completada',
          quantity_produced: quantityProduced,
          production_date: formData.production_date,
          notes: formData.notes || order.notes,
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      alert(`✅ Producción registrada exitosamente!\n\n` +
        `🍞 Producto: ${order.product.name}\n` +
        `📦 Cantidad: ${quantityProduced} ${order.product.unit.symbol}\n` +
        `🏷️ Lote: ${productBatchCode}\n` +
        `💰 Costo Total: S/ ${totalProductionCost.toFixed(2)}\n` +
        `📅 Vence: ${expirationDate.toLocaleDateString('es-PE')}`)

      router.push('/produccion/ordenes')
      router.refresh()

    } catch (error: any) {
      console.error('Error completo:', error)
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
