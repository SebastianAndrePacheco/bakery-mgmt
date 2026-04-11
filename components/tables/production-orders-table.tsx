'use client'

import { ProductionOrder, Product } from '@/utils/types/database.types'
import { Eye, Calendar, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDate } from '@/utils/helpers/dates'

interface ProductionOrderWithRelations extends ProductionOrder {
  product?: Product & { unit?: { symbol: string } }
}

interface ProductionOrdersTableProps {
  orders: ProductionOrderWithRelations[]
}

const statusColors: Record<string, string> = {
  programada: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  en_proceso: 'bg-blue-100 text-blue-700 border-blue-200',
  completada: 'bg-green-100 text-green-700 border-green-200',
  cancelada: 'bg-red-100 text-red-700 border-red-200',
}

const statusLabels: Record<string, string> = {
  programada: 'Programada',
  en_proceso: 'En Proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

export function ProductionOrdersTable({ orders }: ProductionOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">🏭</div>
        <p className="text-lg font-medium text-slate-700">No hay órdenes de producción</p>
        <p className="text-sm text-slate-500 mt-2">
          Crea tu primera orden para comenzar a producir
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
              Producto
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Fecha Producción
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Cantidad
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
                <span className="font-mono text-sm font-medium text-slate-900">
                  {order.order_number}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-medium text-slate-900">
                      {order.product?.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.product?.code}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatDate(order.production_date)}
                </div>
              </td>
              <td className="py-4 px-4 text-right">
                <span className="text-lg font-bold text-purple-600">
                  {order.quantity_planned}
                </span>
                <span className="text-sm text-slate-500 ml-1">
                  {order.product?.unit?.symbol}
                </span>
              </td>
              <td className="py-4 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    statusColors[order.status]
                  }`}
                >
                  {statusLabels[order.status]}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/produccion/ordenes/${order.id}`}>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-blue-50 hover:text-blue-600"
                      title="Ver detalle"
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
