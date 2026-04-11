'use client'

import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { formatDate } from '@/utils/helpers/dates'

interface Adjustment {
  id: string
  movement_type: string
  movement_date: string
  entity_type: string
  quantity: number
  notes?: string
  created_at: string
  supply?: {
    id: string
    code: string
    name: string
    unit?: { symbol: string }
  }
  product?: {
    id: string
    code: string
    name: string
    unit?: { symbol: string }
  }
}

interface AdjustmentsTableProps {
  adjustments: Adjustment[]
}

export function AdjustmentsTable({ adjustments }: AdjustmentsTableProps) {
  if (adjustments.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">⚙️</div>
        <p className="text-lg font-medium text-slate-700">No hay ajustes registrados</p>
        <p className="text-sm text-slate-500 mt-2">
          Los ajustes de inventario aparecerán aquí
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
              Fecha
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Tipo
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Artículo
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Cantidad
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Observaciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {adjustments.map((adj) => {
            const entity = adj.entity_type === 'insumo' ? adj.supply : adj.product
            const isPositive = adj.movement_type === 'entrada'

            return (
              <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(adj.movement_date)}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          Positivo
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-700">
                          Negativo
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-slate-900">
                      {entity?.name || 'Desconocido'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {entity?.code} • {adj.entity_type === 'insumo' ? 'Insumo' : 'Producto'}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`text-lg font-bold ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? '+' : '-'}{adj.quantity.toFixed(3)}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">
                    {entity?.unit?.symbol}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-600">
                    {adj.notes || '-'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
