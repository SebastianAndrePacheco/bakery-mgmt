'use client'

import { InventoryMovement, Unit } from '@/utils/types/database.types'
import { ArrowDown, ArrowUp, RefreshCw, Calendar, Package } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'

interface MovementWithDetails extends InventoryMovement {
  unit?: Unit
  entity_name?: string
}

interface KardexTableProps {
  movements: MovementWithDetails[]
}

const movementTypeIcons = {
  entrada: <ArrowDown className="w-4 h-4 text-green-600" />,
  salida: <ArrowUp className="w-4 h-4 text-red-600" />,
  ajuste: <RefreshCw className="w-4 h-4 text-blue-600" />,
}

const movementTypeColors = {
  entrada: 'bg-green-50 text-green-700 border-green-200',
  salida: 'bg-red-50 text-red-700 border-red-200',
  ajuste: 'bg-blue-50 text-blue-700 border-blue-200',
}

const movementTypeLabels = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

const movementReasonLabels = {
  compra: 'Compra',
  produccion: 'Producción',
  merma: 'Merma',
  vencimiento: 'Vencimiento',
  ajuste_inventario: 'Ajuste Inventario',
  devolucion_proveedor: 'Devolución',
  venta_manual: 'Venta Manual',
}

export function KardexTable({ movements }: KardexTableProps) {
  if (movements.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-lg font-medium text-slate-700">No hay movimientos registrados</p>
        <p className="text-sm text-slate-500 mt-2">
          Los movimientos aparecerán aquí cuando recibas órdenes o registres producción
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
              Motivo
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Artículo
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Cantidad
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Costo Total
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Notas
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatDate(movement.movement_date)}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  {movementTypeIcons[movement.movement_type]}
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      movementTypeColors[movement.movement_type]
                    }`}
                  >
                    {movementTypeLabels[movement.movement_type]}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-slate-600">
                  {movementReasonLabels[movement.movement_reason]}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-medium text-slate-900">
                      {movement.entity_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {movement.entity_type === 'insumo' ? 'Insumo' : 'Producto'}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 text-right">
                <span className={`font-semibold ${
                  movement.movement_type === 'entrada' 
                    ? 'text-green-600' 
                    : movement.movement_type === 'salida'
                    ? 'text-red-600'
                    : 'text-blue-600'
                }`}>
                  {movement.movement_type === 'entrada' ? '+' : movement.movement_type === 'salida' ? '-' : '±'}
                  {movement.quantity} {movement.unit?.symbol}
                </span>
              </td>
              <td className="py-4 px-4 text-right">
                <span className="font-semibold text-slate-900">
                  {movement.total_cost ? formatCurrency(movement.total_cost) : '-'}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-slate-600">
                  {movement.notes || '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
