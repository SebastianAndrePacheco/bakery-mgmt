'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Package } from 'lucide-react'
import { toast } from 'sonner'
import { receivePurchaseOrder } from '@/app/actions'

interface ReceiveOrderItem {
  id: string
  supply_id: string
  quantity: number
  unit_price: number
  supply: {
    name: string
    code: string
    unit?: { symbol: string } | null
  }
}

interface ReceiveOrderFormProps {
  order: { id: string; total: number; order_number: string }
  items: ReceiveOrderItem[]
}

export function ReceiveOrderForm({ order, items }: ReceiveOrderFormProps) {
  const router = useRouter()
  const { confirm, dialog } = useConfirm()
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

    const itemsPayload = items
      .filter(item => parseFloat(receivedQuantities[item.id] || '0') > 0)
      .map(item => ({
        supply_id:         item.supply_id,
        quantity_received: parseFloat(receivedQuantities[item.id] || '0'),
        unit_price:        item.unit_price,
        expiration_date:   expirationDates[item.id] || '',
      }))

    if (itemsPayload.length === 0) {
      toast.error('Ingresa al menos una cantidad recibida mayor a 0')
      return
    }

    const ok = await confirm({
      title: 'Confirmar recepción de mercancía',
      description: `Se crearán ${itemsPayload.length} lote(s) de inventario y se actualizará el stock. Esta acción no se puede deshacer.`,
      confirmLabel: 'Confirmar recepción',
      variant: 'default',
    })
    if (!ok) return

    setLoading(true)

    try {
      const result = await receivePurchaseOrder({
        order_id:           order.id,
        received_date:      formData.received_date,
        guia_remision:      formData.guia_remision,
        comprobante_tipo:   formData.comprobante_tipo,
        comprobante_serie:  formData.comprobante_serie,
        comprobante_numero: formData.comprobante_numero,
        comprobante_fecha:  formData.comprobante_fecha,
        comprobante_monto:  parseFloat(formData.comprobante_monto),
        items:              itemsPayload,
      })

      if ('error' in result) {
        toast.error('Error al registrar recepción: ' + result.error)
        return
      }

      toast.success('Recepción registrada — stock actualizado correctamente')
      router.push('/compras/ordenes')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {dialog}
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Documentos Peruanos */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4">Documentos de Recepción (Perú)</h3>
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
                step="any"
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
    </>
  )
}
