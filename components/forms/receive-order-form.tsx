'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { PurchaseOrder } from '@/utils/types/database.types'
import { Package, Calendar, FileText, AlertCircle } from 'lucide-react'

interface ReceiveOrderFormProps {
  order: PurchaseOrder
  items: any[]
}

export function ReceiveOrderForm({ order, items }: ReceiveOrderFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity }), {})
  )
  
  // Datos de documentos
  const [guiaRemision, setGuiaRemision] = useState('')
  const [comprobanteTipo, setComprobanteTipo] = useState<'factura' | 'boleta' | 'ticket' | 'recibo'>('factura')
  const [comprobanteSerie, setComprobanteSerie] = useState('')
  const [comprobanteNumero, setComprobanteNumero] = useState('')
  const [comprobanteFecha, setComprobanteFecha] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [comprobanteMonto, setComprobanteMonto] = useState(order.total.toString())

  const updateQuantity = (itemId: string, quantity: number) => {
    setReceivedQuantities({ ...receivedQuantities, [itemId]: quantity })
  }

  const handleReceive = async () => {
    setLoading(true)

    try {
      // Validar documentos obligatorios
      if (!guiaRemision.trim()) {
        alert('⚠️ Debe ingresar el N° de Guía de Remisión')
        setLoading(false)
        return
      }

      if (!comprobanteSerie.trim() || !comprobanteNumero.trim()) {
        alert('⚠️ Debe ingresar el comprobante completo (Serie y Número)')
        setLoading(false)
        return
      }

      // Validar monto (permitir 1 sol de diferencia por redondeo)
      const montoIngresado = parseFloat(comprobanteMonto)
      const diferencia = Math.abs(montoIngresado - order.total)
      if (diferencia > 1) {
        const confirmar = confirm(
          `⚠️ El monto del comprobante (S/ ${montoIngresado.toFixed(2)}) difiere del total de la orden (S/ ${order.total.toFixed(2)}).\n\n¿Desea continuar de todos modos?`
        )
        if (!confirmar) {
          setLoading(false)
          return
        }
      }

      // Determinar si la recepción es completa o parcial
      let isComplete = true
      for (const item of items) {
        if (receivedQuantities[item.id] < item.quantity) {
          isComplete = false
          break
        }
      }

      const newStatus = isComplete ? 'recibido_completo' : 'recibido_parcial'

      // Actualizar estado de la orden con documentos
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({
          status: newStatus,
          actual_delivery_date: receivedDate,
          guia_remision: guiaRemision.trim(),
          comprobante_tipo: comprobanteTipo,
          comprobante_serie: comprobanteSerie.trim().toUpperCase(),
          comprobante_numero: comprobanteNumero.trim(),
          comprobante_fecha: comprobanteFecha,
          comprobante_monto: montoIngresado,
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      // Crear lotes de insumos (supply_batches) por cada item recibido
      for (const item of items) {
        const receivedQty = receivedQuantities[item.id]
        if (receivedQty > 0) {
          const batchCode = `LOTE-${order.order_number}-${item.supply.code}-${Date.now()}`
          
          const { error: batchError } = await supabase
            .from('supply_batches')
            .insert([{
              supply_id: item.supply_id,
              supplier_id: order.supplier_id,
              purchase_order_id: order.id,
              batch_code: batchCode,
              quantity_received: receivedQty,
              unit_price: item.unit_price,
              total_cost: receivedQty * item.unit_price,
              received_date: receivedDate,
              current_quantity: receivedQty,
              status: 'disponible',
            }])

          if (batchError) throw batchError

          // Registrar movimiento de inventario
          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert([{
              movement_type: 'entrada',
              movement_reason: 'compra',
              entity_type: 'insumo',
              entity_id: item.supply_id,
              quantity: receivedQty,
              unit_id: item.supply.unit.id,
              unit_cost: item.unit_price,
              total_cost: receivedQty * item.unit_price,
              reference_type: 'purchase_order',
              reference_id: order.id,
              notes: `Recepción de orden ${order.order_number} - GR: ${guiaRemision} - ${comprobanteTipo.toUpperCase()}: ${comprobanteSerie}-${comprobanteNumero}`,
              movement_date: receivedDate,
            }])

          if (movementError) throw movementError
        }
      }

      // Recargar la página actual para ver los cambios
      router.refresh()
      
      // Mostrar mensaje de éxito
      alert('✅ Orden recibida correctamente.\n\n📄 Documentos registrados:\n- Guía: ' + guiaRemision + '\n- Comprobante: ' + comprobanteSerie + '-' + comprobanteNumero)
    } catch (error: any) {
      console.error('Error completo:', error)
      alert('❌ Error al recibir orden: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Documentos de Recepción */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 text-lg">
            Documentos de Recepción (Obligatorio)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guía de Remisión */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              N° Guía de Remisión <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={guiaRemision}
              onChange={(e) => setGuiaRemision(e.target.value)}
              placeholder="001-0001234"
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo de Comprobante */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Tipo de Comprobante <span className="text-red-600">*</span>
            </label>
            <select
              value={comprobanteTipo}
              onChange={(e) => setComprobanteTipo(e.target.value as any)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="factura">Factura</option>
              <option value="boleta">Boleta</option>
              <option value="ticket">Ticket</option>
              <option value="recibo">Recibo</option>
            </select>
          </div>

          {/* Serie */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Serie <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={comprobanteSerie}
              onChange={(e) => setComprobanteSerie(e.target.value.toUpperCase())}
              placeholder="F001 o B001"
              maxLength={4}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          {/* Número */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Número <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={comprobanteNumero}
              onChange={(e) => setComprobanteNumero(e.target.value)}
              placeholder="00012345"
              maxLength={8}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha Emisión */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Fecha de Emisión <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={comprobanteFecha}
              onChange={(e) => setComprobanteFecha(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Monto Total */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              Monto Total del Comprobante <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-600">S/</span>
              <input
                type="number"
                step="0.01"
                value={comprobanteMonto}
                onChange={(e) => setComprobanteMonto(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {Math.abs(parseFloat(comprobanteMonto) - order.total) > 0.1 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>El monto difiere del total de la orden (S/ {order.total.toFixed(2)})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fecha de recepción */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-slate-600" />
          <label className="font-medium text-slate-900">
            Fecha de Recepción Física
          </label>
        </div>
        <input
          type="date"
          value={receivedDate}
          onChange={(e) => setReceivedDate(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Lista de items con cantidades */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Cantidades Recibidas</h3>
        {items.map((item: any) => (
          <div 
            key={item.id} 
            className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-50 rounded-lg border border-slate-200"
          >
            <div className="col-span-6">
              <div className="font-medium text-slate-900">{item.supply.name}</div>
              <div className="text-sm text-slate-500">
                Código: {item.supply.code}
              </div>
            </div>
            <div className="col-span-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Solicitado</div>
              <div className="font-semibold text-slate-700">
                {item.quantity} {item.supply.unit?.symbol}
              </div>
            </div>
            <div className="col-span-3">
              <div className="text-xs text-slate-500 mb-1">Recibido</div>
              <input
                type="number"
                step="0.01"
                min="0"
                max={item.quantity}
                value={receivedQuantities[item.id]}
                onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Botones */}
      <div className="flex gap-4">
        <Button 
          onClick={handleReceive} 
          disabled={loading}
          className="flex-1"
        >
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

      <div className="text-sm text-slate-500 bg-amber-50 p-4 rounded-lg border border-amber-200">
        <strong>Nota:</strong> Al confirmar la recepción se crearán automáticamente:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Registro de documentos (Guía de Remisión y Comprobante)</li>
          <li>Lotes de inventario con sistema FIFO</li>
          <li>Movimientos de entrada en el Kardex</li>
          <li>Actualización del estado de la orden</li>
        </ul>
      </div>
    </div>
  )
}
