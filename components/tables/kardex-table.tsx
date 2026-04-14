'use client'

import { InventoryMovement, Unit } from '@/utils/types/database.types'
import { ArrowDown, ArrowUp, Calendar, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'

interface MovementWithDetails extends InventoryMovement {
  unit?: Unit
  entity_name?: string
}

const movementReasonLabels: Record<string, string> = {
  compra: 'Compra',
  produccion: 'Producción',
  merma: 'Merma',
  vencimiento: 'Vencimiento',
  ajuste_inventario: 'Ajuste',
  devolucion_proveedor: 'Devolución',
  venta_manual: 'Venta',
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-sm text-slate-400">
      Sin {label} registradas
    </div>
  )
}

function KardexMiniTable({
  movements,
  type,
}: {
  movements: MovementWithDetails[]
  type: 'entrada' | 'salida'
}) {
  if (movements.length === 0) {
    return <EmptyState label={type === 'entrada' ? 'entradas' : 'salidas'} />
  }

  const amountColor = type === 'entrada' ? 'text-green-600' : 'text-red-600'
  const sign = type === 'entrada' ? '+' : '-'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 px-3 font-semibold text-slate-600">Fecha</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-600">Artículo</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-600">Motivo</th>
            <th className="text-right py-2 px-3 font-semibold text-slate-600">Cant.</th>
            <th className="text-right py-2 px-3 font-semibold text-slate-600">Costo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {movements.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(m.movement_date)}
                </span>
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="font-medium text-slate-900 truncate max-w-[140px]" title={m.entity_name}>
                    {m.entity_name}
                  </span>
                </div>
              </td>
              <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                {movementReasonLabels[m.movement_reason] ?? m.movement_reason}
              </td>
              <td className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${amountColor}`}>
                {sign}{m.quantity} {(m.unit as unknown as { symbol: string })?.symbol}
              </td>
              <td className="py-2 px-3 text-right text-slate-700 whitespace-nowrap">
                {m.total_cost ? formatCurrency(m.total_cost) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface KardexColumnsProps {
  entradas: MovementWithDetails[]
  salidasInsumo: MovementWithDetails[]
  salidasProducto: MovementWithDetails[]
}

export function KardexColumns({ entradas, salidasInsumo, salidasProducto }: KardexColumnsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Entradas */}
      <Card className="border-green-200">
        <CardHeader className="pb-3 bg-green-50 rounded-t-lg border-b border-green-100">
          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-green-600" />
            <CardTitle className="text-base text-green-800">Entradas</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            {entradas.length} movimiento{entradas.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <KardexMiniTable movements={entradas} type="entrada" />
        </CardContent>
      </Card>

      {/* Salidas — Insumos */}
      <Card className="border-red-200">
        <CardHeader className="pb-3 bg-red-50 rounded-t-lg border-b border-red-100">
          <div className="flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-red-600" />
            <CardTitle className="text-base text-red-800">Salidas — Insumos</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            {salidasInsumo.length} movimiento{salidasInsumo.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <KardexMiniTable movements={salidasInsumo} type="salida" />
        </CardContent>
      </Card>

      {/* Salidas — Productos */}
      <Card className="border-orange-200">
        <CardHeader className="pb-3 bg-orange-50 rounded-t-lg border-b border-orange-100">
          <div className="flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-orange-600" />
            <CardTitle className="text-base text-orange-800">Salidas — Productos</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            {salidasProducto.length} movimiento{salidasProducto.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <KardexMiniTable movements={salidasProducto} type="salida" />
        </CardContent>
      </Card>
    </div>
  )
}
