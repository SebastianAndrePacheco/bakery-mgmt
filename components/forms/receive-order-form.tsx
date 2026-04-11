'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'

interface ReceiveOrderFormProps {
  order: any
  items: any[]
}

export function ReceiveOrderForm({ order, items }: ReceiveOrderFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    guia_remision: '',
    comprobante_tipo: 'factura',
    comprobante_serie: '',
    comprobante_numero: '',
    comprobante_fecha: new Date().toISOString().split('T')[0],
    comprobante_monto: order.total.toString(),
    received_date: new Date().toISOString().split('T')[0],
  })

  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, string>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity.toString() }), {})
  )

  const [expirationDates, setExpirationDates] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // DEBUG: Ver qué datos tenemos
    console.log('Items completos:', JSON.stringify(items, null, 2))

    const confirm = window.confirm(
      '¿Confirmar recepción de mercancía?\n\nEsto creará los lotes de inventario y actualizará el stock.'
    )
    if (!confirm) return

    setLoading(true)

    try {
      // 1. Actualizar orden de compra
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'recibido_completo',
          actual_delivery_date: formData.received_date,
          guia_remision: formData.guia_remision,
          comprobante_tipo: formData.comprobante_tipo,
          comprobante_serie: formData.comprobante_serie,
          comprobante_numero: formData.comprobante_numero,
          comprobante_fecha: formData.comprobante_fecha,
          comprobante_monto: parseFloat(formData.comprobante_monto),
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      // 2. Crear lotes y registrar en kardex
      for (const item of items) {
        const receivedQty = parseFloat(receivedQuantities[item.id] || '0')
        if (receivedQty <= 0) continue

        console.log('Processing item:', {
          supply_name: item.supply?.name,
          supply_id: item.supply_id,
          unit_id_from_supply: item.supply?.unit_id,
          unit_from_supply: item.supply?.unit
        })

        const batchCode = `LOTE-${order.order_number}-${item.supply.code}-${Date.now()}`

        // Crear lote
        const { data: batch, error: batchError } = await supabase
          .from('supply_batches')
          .insert([{
            supply_id: item.supply_id,
            supplier_id: order.supplier_id,
            purchase_order_id: order.id,
            batch_code: batchCode,
            quantity_received: receivedQty,
            unit_price: item.unit_price,
            total_cost: receivedQty * item.unit_price,
            expiration_date: expirationDates[item.id] || null,
            received_date: formData.received_date,
            current_quantity: receivedQty,
            status: 'disponible',
          }])
          .select()
          .single()

        if (batchError) throw batchError

        // Obtener el unit_id directamente del supply si no está en el objeto
        let unitId = item.supply?.unit_id || item.supply?.unit?.id

        // Si aún no lo tenemos, hacer un query
        if (!unitId) {
          const { data: supplyData } = await supabase
            .from('supplies')
            .select('unit_id')
            .eq('id', item.supply_id)
            .single()
          
          unitId = supplyData?.unit_id
        }

        console.log('Unit ID final:', unitId)

        if (!unitId) {
          throw new Error(`No se pudo obtener unit_id para ${item.supply?.name}`)
        }

        // Registrar en kardex
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert([{
            movement_type: 'entrada',
            movement_reason: 'compra',
            entity_type: 'insumo',
            entity_id: item.supply_id,
            batch_id: batch.id,
            quantity: receivedQty,
            unit_id: unitId,
            unit_cost: item.unit_price,
            total_cost: receivedQty * item.unit_price,
            reference_type: 'purchase_order',
            reference_id: order.id,
            notes: `Recepción de orden ${order.order_number} - GR: ${formData.guia_remision} - ${formData.comprobante_tipo.toUpperCase()}: ${formData.comprobante_serie}-${formData.comprobante_numero}`,
            movement_date: formData.received_date,
          }])

        if (movementError) {
          console.error('Error al insertar movimiento:', movementError)
          throw movementError
        }
      }

      alert('✅ Recepción registrada exitosamente!')
      router.push('/compras/ordenes')
      router.refresh()

    } catch (error: any) {
      console.error('Error completo:', error)
      alert('❌ Error al registrar recepción: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Documentos Peruanos */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4">📄 Documentos de Recepción (Perú)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Guía de Remisión <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.guia_remision}
              onChange={(e) => setFormData({ ...formData, guia_remision: e.target.value })}
              placeholder="001-00123456"
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Tipo de Comprobante <span className="text-red-600">*</span>
            </label>
            <select
              required
              value={formData.comprobante_tipo}
              onChange={(e) => setFormData({ ...formData, comprobante_tipo: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="factura">Factura</option>
              <option value="boleta">Boleta de Venta</option>
              <option value="ticket">Ticket</option>
              <option value="recibo">Recibo</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Serie <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.comprobante_serie}
              onChange={(e) => setFormData({ ...formData, comprobante_serie: e.target.value })}
              placeholder="F001"
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Número <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.comprobante_numero}
              onChange={(e) => setFormData({ ...formData, comprobante_numero: e.target.value })}
              placeholder="00098765"
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Fecha del Comprobante <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.comprobante_fecha}
              onChange={(e) => setFormData({ ...formData, comprobante_fecha: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Monto del Comprobante <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.comprobante_monto}
              onChange={(e) => setFormData({ ...formData, comprobante_monto: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Fecha de recepción */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Fecha de Recepción <span className="text-red-600">*</span>
        </label>
        <input
          type="date"
          required
          value={formData.received_date}
          onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Items a recibir */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Cantidades Recibidas</h3>
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">{item.supply.name}</div>
              <div className="text-sm text-slate-600">
                Ordenado: {item.quantity} {item.supply.unit?.symbol}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad Recibida</label>
              <input
                type="number"
                step="0.001"
                min="0"
                max={item.quantity}
                value={receivedQuantities[item.id]}
                onChange={(e) => setReceivedQuantities({
                  ...receivedQuantities,
                  [item.id]: e.target.value
                })}
                className="w-full px-3 py-2 border border-input rounded-md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Vencimiento</label>
              <input
                type="date"
                value={expirationDates[item.id] || ''}
                onChange={(e) => setExpirationDates({
                  ...expirationDates,
                  [item.id]: e.target.value
                })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-input rounded-md"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          <Package className="w-4 h-4 mr-2" />
          {loading ? 'Procesando...' : 'Confirmar Recepción'}
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
