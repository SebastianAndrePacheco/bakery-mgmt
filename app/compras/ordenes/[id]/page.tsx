import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/utils/helpers/dates'
import { formatCurrency } from '@/utils/helpers/currency'
import { ReceiveOrderForm } from '@/components/forms/receive-order-form'
import { PurchaseOrderActions } from '@/components/purchase-order-actions'
import { Breadcrumb } from '@/components/ui/breadcrumb'

const statusColors: Record<string, string> = {
  borrador:             'bg-slate-100 text-slate-600 border-slate-200',
  pendiente_aprobacion: 'bg-amber-100 text-amber-700 border-amber-200',
  aprobado:             'bg-blue-100 text-blue-700 border-blue-200',
  rechazado:            'bg-red-100 text-red-700 border-red-200',
  pendiente:            'bg-yellow-100 text-yellow-700 border-yellow-200',
  enviado:              'bg-indigo-100 text-indigo-700 border-indigo-200',
  recibido_completo:    'bg-green-100 text-green-700 border-green-200',
  recibido_parcial:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelado:            'bg-red-100 text-red-600 border-red-200',
  retrasado:            'bg-orange-100 text-orange-700 border-orange-200',
}

const statusLabels: Record<string, string> = {
  borrador:             'Borrador',
  pendiente_aprobacion: 'Pend. aprobación',
  aprobado:             'Aprobado',
  rechazado:            'Rechazado',
  pendiente:            'Pendiente',
  enviado:              'Enviado',
  recibido_completo:    'Recibido Completo',
  recibido_parcial:     'Recibido Parcial',
  cancelado:            'Cancelado',
  retrasado:            'Retrasado',
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(id, business_name, ruc, contact_name, phone)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const [
    { data: items },
    { data: approvals },
    { data: { user } },
  ] = await Promise.all([
    supabase
      .from('purchase_order_items')
      .select('*, supply:supplies(id, code, name, unit_id, unit:units(id, name, symbol))')
      .eq('purchase_order_id', id)
      .order('created_at'),
    supabase
      .from('purchase_order_approvals')
      .select('*')
      .eq('purchase_order_id', id)
      .order('created_at'),
    supabase.auth.getUser(),
  ])

  const { data: profile } = user
    ? await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const userRole = profile?.role ?? 'cajero'
  const canReceive = ['pendiente', 'aprobado', 'enviado', 'retrasado'].includes(order.status)
  const showActions = ['borrador', 'pendiente_aprobacion', 'aprobado'].includes(order.status)

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Compras', href: '/compras' },
        { label: 'Órdenes de Compra', href: '/compras/ordenes' },
        { label: order.order_number },
      ]} />

      <div className="flex items-center gap-4">
        <Link href="/compras/ordenes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Orden {order.order_number}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[order.status] ?? ''}`}>
              {statusLabels[order.status] ?? order.status}
            </span>
          </div>
          <p className="text-muted-foreground">Creada el {formatDate(order.created_at)}</p>
        </div>
        <Link href={`/compras/ordenes/${order.id}/print`} target="_blank">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Información de la Orden</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Proveedor</label>
                <p className="text-lg font-semibold">{order.supplier.business_name}</p>
                <p className="text-sm text-slate-500">RUC: {order.supplier.ruc}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Contacto</label>
                <p className="text-lg font-semibold">{order.supplier.contact_name}</p>
                <p className="text-sm text-slate-500">{order.supplier.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Fecha de Orden</label>
                <p className="text-lg font-semibold">{formatDate(order.order_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Entrega Esperada</label>
                <p className="text-lg font-semibold">
                  {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal (sin IGV):</span>
              <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">IGV:</span>
              <span className="font-semibold">{formatCurrency(order.tax)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-lg font-bold text-purple-600">{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de aprobación */}
      {showActions && (
        <Card>
          <CardHeader>
            <CardTitle>Flujo de aprobación</CardTitle>
            <CardDescription>
              {order.status === 'borrador' && 'La orden está en borrador. Envíala a aprobación cuando esté lista.'}
              {order.status === 'pendiente_aprobacion' && 'Esperando aprobación del administrador.'}
              {order.status === 'aprobado' && 'Orden aprobada. Puedes marcarla como enviada al proveedor.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseOrderActions
              orderId={order.id}
              status={order.status}
              role={userRole}
              approvals={approvals ?? []}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ítems de la Orden</CardTitle>
          <CardDescription>{items?.length || 0} insumos ordenados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Insumo</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad ordenada</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">P. Unit. (sin IGV)</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items?.map((item) => {
                  const hasPackage = item.package_quantity != null && item.units_per_package != null && item.units_per_package > 1
                  return (
                    <tr key={item.id}>
                      <td className="py-3 px-4 font-mono text-sm">{item.supply.code}</td>
                      <td className="py-3 px-4 font-medium">{item.supply.name}</td>
                      <td className="py-3 px-4 text-right">
                        {hasPackage ? (
                          <span>
                            {item.package_quantity} {item.purchase_unit}
                            <span className="text-slate-400 text-xs ml-1">
                              × {item.units_per_package} {item.supply.unit?.symbol}
                            </span>
                          </span>
                        ) : (
                          <span>{item.quantity} {item.supply.unit?.symbol}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recibir mercancía: solo si la orden fue aprobada/enviada */}
      {canReceive && items && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recibir Mercancía</CardTitle>
            <CardDescription>Registra la recepción de esta orden de compra</CardDescription>
          </CardHeader>
          <CardContent>
            <ReceiveOrderForm order={order} items={items} />
          </CardContent>
        </Card>
      )}

      {order.status === 'recibido_completo' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-green-700 font-medium mb-2">Esta orden ya fue recibida completamente</p>
              <div className="text-sm text-green-600 space-y-1">
                <p>Fecha de recepción: {order.actual_delivery_date ? formatDate(order.actual_delivery_date) : '-'}</p>
                {order.guia_remision && <p>Guía de Remisión: {order.guia_remision}</p>}
                {order.comprobante_tipo && (
                  <p>{order.comprobante_tipo.toUpperCase()}: {order.comprobante_serie}-{order.comprobante_numero}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order.notes && (
        <Card>
          <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
          <CardContent><p className="text-slate-700">{order.notes}</p></CardContent>
        </Card>
      )}
    </div>
  )
}
