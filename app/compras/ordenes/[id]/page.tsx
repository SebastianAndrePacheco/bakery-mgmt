import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, User, Package, Receipt } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'
import { ReceiveOrderForm } from '@/components/forms/receive-order-form'
import { PurchaseOrderPrint } from '@/components/print/purchase-order-print'

export default async function PurchaseOrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: order } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, business_name, ruc, contact_name, phone, email, address)
    `)
    .eq('id', id)
    .single()

  if (!order) {
    notFound()
  }

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select(`
      *,
      supply:supplies(
        id,
        code,
        name,
        unit:units(id, name, symbol)
      )
    `)
    .eq('purchase_order_id', id)

  const statusColors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    enviado: 'bg-blue-100 text-blue-700 border-blue-200',
    recibido_completo: 'bg-green-100 text-green-700 border-green-200',
    recibido_parcial: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelado: 'bg-red-100 text-red-700 border-red-200',
    retrasado: 'bg-orange-100 text-orange-700 border-orange-200',
  }

  const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    enviado: 'Enviado',
    recibido_completo: 'Recibido Completo',
    recibido_parcial: 'Recibido Parcial',
    cancelado: 'Cancelado',
    retrasado: 'Retrasado',
  }

  const comprobanteTipoLabels: Record<string, string> = {
    factura: 'Factura Electrónica',
    boleta: 'Boleta de Venta',
    ticket: 'Ticket',
    recibo: 'Recibo por Honorarios',
  }

  const canReceive = order.status === 'pendiente' || order.status === 'enviado' || order.status === 'retrasado'
  const hasDocuments = order.guia_remision || order.comprobante_serie

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/compras/ordenes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Orden {order.order_number}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>
          <p className="text-muted-foreground">
            Creada el {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <PurchaseOrderPrint order={order} items={items || []} />
        </div>
      </div>

      {hasDocuments && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Receipt className="w-5 h-5" />
              Documentos de Recepción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {order.guia_remision && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <label className="text-sm font-medium text-blue-700">Guía de Remisión</label>
                  <p className="text-xl font-bold text-blue-900 mt-1">{order.guia_remision}</p>
                </div>
              )}
              {order.comprobante_tipo && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <label className="text-sm font-medium text-blue-700">Tipo de Comprobante</label>
                  <p className="text-lg font-semibold text-blue-900 mt-1">
                    {comprobanteTipoLabels[order.comprobante_tipo] || order.comprobante_tipo}
                  </p>
                </div>
              )}
              {order.comprobante_serie && (
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <label className="text-sm font-medium text-blue-700">N° Comprobante</label>
                  <p className="text-xl font-bold text-blue-900 font-mono mt-1">
                    {order.comprobante_serie}-{order.comprobante_numero}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información del Proveedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-600">Razón Social</label>
              <p className="text-lg font-semibold">{order.supplier.business_name}</p>
            </div>
            {order.supplier.ruc && (
              <div>
                <label className="text-sm font-medium text-slate-600">RUC</label>
                <p className="text-lg font-mono">{order.supplier.ruc}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Insumos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Insumo</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Precio</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Total</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 font-mono text-sm">{item.supply.code}</td>
                    <td className="py-3 px-4">{item.supply.name}</td>
                    <td className="py-3 px-4 text-right">{item.quantity} {item.supply.unit?.symbol}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 bg-slate-50 p-6 rounded-lg">
            <div className="max-w-sm ml-auto space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IGV:</span>
                <span className="font-semibold">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canReceive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Recibir Orden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReceiveOrderForm order={order} items={items || []} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
