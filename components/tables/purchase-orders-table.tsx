'use client'

import { PurchaseOrder, Supplier } from '@/utils/types/database.types'
import { Eye, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'

interface PurchaseOrderWithRelations extends PurchaseOrder {
  supplier?: Supplier
}

interface PurchaseOrdersTableProps {
  orders: PurchaseOrderWithRelations[]
}

const statusColors: Record<PurchaseOrder['status'], string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  enviado: 'bg-blue-100 text-blue-700',
  recibido_parcial: 'bg-orange-100 text-orange-700',
  recibido_completo: 'bg-emerald-100 text-emerald-700',
  retrasado: 'bg-purple-100 text-purple-700',
  cancelado: 'bg-red-100 text-red-700',
}

const statusLabels: Record<PurchaseOrder['status'], string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  recibido_parcial: 'Recibido Parcial',
  recibido_completo: 'Recibido Completo',
  retrasado: 'Retrasado',
  cancelado: 'Cancelado',
}

export function PurchaseOrdersTable({ orders }: PurchaseOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-lg font-medium text-slate-700">No hay órdenes de compra registradas</p>
        <p className="text-sm text-slate-500 mt-2">
          Comienza creando tu primera orden de compra
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              N° Orden
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Proveedor
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Fecha Orden
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Entrega Esperada
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Total
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Estado
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-sm font-medium text-slate-900">
                    {order.order_number}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="font-medium text-slate-900">
                  {order.supplier?.business_name || '-'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {order.supplier?.contact_name || '-'}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatDate(order.order_date)}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="text-sm text-slate-600">
                  {order.expected_delivery_date 
                    ? formatDate(order.expected_delivery_date)
                    : '-'
                  }
                </div>
              </td>
              <td className="py-4 px-4 text-right">
                <div className="font-semibold text-slate-900">
                  {formatCurrency(order.total)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  + IGV {formatCurrency(order.tax)}
                </div>
              </td>
              <td className="py-4 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    statusColors[order.status]
                  }`}
                >
                  {statusLabels[order.status]}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/compras/ordenes/${order.id}`}>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
