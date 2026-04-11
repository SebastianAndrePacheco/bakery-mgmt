'use client'

import { Calendar, Package, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate, daysUntil, isExpired, isExpiringSoon } from '@/utils/helpers/dates'

interface ProductBatch {
  id: string
  batch_code: string
  production_date: string
  expiration_date?: string
  quantity_produced: number
  current_quantity: number
  unit_cost?: number
  total_cost?: number
  status: string
  product?: {
    id: string
    code: string
    name: string
    unit?: { symbol: string }
  }
}

interface ProductBatchesTableProps {
  batches: ProductBatch[]
}

const statusColors: Record<string, string> = {
  disponible: 'bg-green-100 text-green-700 border-green-200',
  agotado: 'bg-slate-100 text-slate-600 border-slate-200',
  vencido: 'bg-red-100 text-red-700 border-red-200',
}

const statusLabels: Record<string, string> = {
  disponible: 'Disponible',
  agotado: 'Agotado',
  vencido: 'Vencido',
}

export function ProductBatchesTable({ batches }: ProductBatchesTableProps) {
  if (batches.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">🍞</div>
        <p className="text-lg font-medium text-slate-700">No hay lotes de productos</p>
        <p className="text-sm text-slate-500 mt-2">
          Los lotes se crearán automáticamente al completar órdenes de producción
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
              Código de Lote
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Producto
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Producción
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Vencimiento
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Producido
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Disponible
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Costo Total
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {batches.map((batch) => {
            const expired = batch.expiration_date && isExpired(batch.expiration_date)
            const expiringSoon = batch.expiration_date && isExpiringSoon(batch.expiration_date, 2)
            const daysLeft = batch.expiration_date ? daysUntil(batch.expiration_date) : null

            return (
              <tr 
                key={batch.id} 
                className={`hover:bg-slate-50 transition-colors ${
                  expired ? 'bg-red-50' : expiringSoon ? 'bg-amber-50' : ''
                }`}
              >
                <td className="py-4 px-4">
                  <span className="font-mono text-sm font-medium text-slate-900">
                    {batch.batch_code}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-900">
                        {batch.product?.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {batch.product?.code}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(batch.production_date)}
                  </div>
                </td>
                <td className="py-4 px-4">
                  {batch.expiration_date ? (
                    <div>
                      <div className={`text-sm font-medium ${
                        expired ? 'text-red-600' : expiringSoon ? 'text-amber-600' : 'text-slate-700'
                      }`}>
                        {formatDate(batch.expiration_date)}
                      </div>
                      {daysLeft !== null && !expired && (
                        <div className={`text-xs mt-0.5 ${
                          expiringSoon ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días`}
                        </div>
                      )}
                      {expired && (
                        <div className="text-xs text-red-600 mt-0.5 font-medium">
                          Vencido
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-sm text-slate-600">
                    {batch.quantity_produced.toFixed(2)} {batch.product?.unit?.symbol}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={`text-lg font-bold ${
                    batch.current_quantity === 0 
                      ? 'text-slate-400' 
                      : 'text-purple-600'
                  }`}>
                    {batch.current_quantity.toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">
                    {batch.product?.unit?.symbol}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="font-semibold text-slate-900">
                    {batch.total_cost ? formatCurrency(batch.total_cost) : '-'}
                  </div>
                  {batch.unit_cost && (
                    <div className="text-xs text-slate-500">
                      {formatCurrency(batch.unit_cost)}/{batch.product?.unit?.symbol}
                    </div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        statusColors[batch.status]
                      }`}
                    >
                      {batch.status === 'disponible' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {statusLabels[batch.status]}
                    </span>
                    {expiringSoon && !expired && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Por vencer
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
