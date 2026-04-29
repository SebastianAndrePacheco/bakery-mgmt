import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/utils/helpers/dates'
import { formatCurrency } from '@/utils/helpers/currency'

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

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: order }, { data: items }, { data: empresa }] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(business_name, ruc, contact_name, phone, address)')
      .eq('id', id)
      .single(),
    supabase
      .from('purchase_order_items')
      .select('*, supply:supplies(id, code, name, unit:units(id, name, symbol))')
      .eq('purchase_order_id', id)
      .order('created_at'),
    supabase.from('empresa_config').select('*').single(),
  ])

  if (!order) notFound()

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-4">
      {/* Botón imprimir (oculto en impresión) */}
      <div className="print:hidden mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-700"
        >
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>

      {/* Encabezado */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {empresa?.razon_social ?? 'Panificadora Ofelia E.I.R.L.'}
          </h1>
          {empresa?.ruc && (
            <p className="text-sm text-slate-500">RUC: {empresa.ruc}</p>
          )}
          {empresa?.direccion_fiscal && (
            <p className="text-sm text-slate-500">{empresa.direccion_fiscal}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900">ORDEN DE COMPRA</div>
          <div className="text-lg font-semibold text-slate-600">{order.order_number}</div>
          <div className="text-sm text-slate-500 mt-1">
            Estado: <span className="font-medium">{statusLabels[order.status] ?? order.status}</span>
          </div>
        </div>
      </div>

      <hr className="border-slate-300 mb-6" />

      {/* Datos de la orden y proveedor */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Proveedor</h2>
          <p className="font-semibold text-slate-900">{order.supplier.business_name}</p>
          {order.supplier.ruc && (
            <p className="text-sm text-slate-600">RUC: {order.supplier.ruc}</p>
          )}
          {order.supplier.contact_name && (
            <p className="text-sm text-slate-600">Contacto: {order.supplier.contact_name}</p>
          )}
          {order.supplier.phone && (
            <p className="text-sm text-slate-600">Tel: {order.supplier.phone}</p>
          )}
        </div>
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Detalle</h2>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-slate-500 w-36">Fecha de orden:</span>
              <span className="font-medium">{formatDate(order.order_date)}</span>
            </div>
            {order.expected_delivery_date && (
              <div className="flex gap-2">
                <span className="text-slate-500 w-36">Entrega esperada:</span>
                <span className="font-medium">{formatDate(order.expected_delivery_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de ítems */}
      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th className="text-left py-2 pr-4 font-semibold text-slate-700">Código</th>
            <th className="text-left py-2 pr-4 font-semibold text-slate-700">Insumo</th>
            <th className="text-right py-2 pr-4 font-semibold text-slate-700">Cantidad</th>
            <th className="text-right py-2 pr-4 font-semibold text-slate-700">P. Unit. s/IGV</th>
            <th className="text-right py-2 font-semibold text-slate-700">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item) => {
            const hasPackage = item.package_quantity != null && item.units_per_package != null && item.units_per_package > 1
            return (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-mono text-xs text-slate-500">{item.supply.code}</td>
                <td className="py-2 pr-4">{item.supply.name}</td>
                <td className="py-2 pr-4 text-right">
                  {hasPackage ? (
                    <span>
                      {item.package_quantity} {item.purchase_unit}
                      <br />
                      <span className="text-xs text-slate-400">
                        × {item.units_per_package} {item.supply.unit?.symbol} c/u
                      </span>
                    </span>
                  ) : (
                    <span>{item.quantity} {item.supply.unit?.symbol}</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Totales */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal (sin IGV):</span>
            <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">IGV:</span>
            <span className="font-semibold">{formatCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-2 text-base">
            <span className="font-bold">Total:</span>
            <span className="font-bold">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {order.notes && (
        <div className="mt-8 p-4 bg-slate-50 rounded border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notas</p>
          <p className="text-sm text-slate-700">{order.notes}</p>
        </div>
      )}

      {/* Firma */}
      <div className="mt-12 grid grid-cols-2 gap-16 text-center text-sm text-slate-500">
        <div>
          <div className="border-t border-slate-400 pt-2 mt-8">Autorizado por</div>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-2 mt-8">Recibido por</div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </div>
  )
}
