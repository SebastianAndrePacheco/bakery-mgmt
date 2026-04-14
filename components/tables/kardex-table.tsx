'use client'

import { InventoryMovement, Unit } from '@/utils/types/database.types'
import { ArrowDown, ArrowUp, Calendar, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

function MiniTable({ movements, type }: { movements: MovementWithDetails[]; type: 'entrada' | 'salida' }) {
  if (movements.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Sin registros</p>
  }

  const color = type === 'entrada' ? 'text-green-600' : 'text-red-600'
  const sign  = type === 'entrada' ? '+' : '-'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 px-3 font-semibold text-slate-500">Fecha</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-500">Artículo</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-500">Motivo</th>
            <th className="text-right py-2 px-3 font-semibold text-slate-500">Cant.</th>
            <th className="text-right py-2 px-3 font-semibold text-slate-500">Costo</th>
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
                  <span className="font-medium text-slate-900 truncate max-w-[130px]" title={m.entity_name}>
                    {m.entity_name}
                  </span>
                </div>
              </td>
              <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                {movementReasonLabels[m.movement_reason] ?? m.movement_reason}
              </td>
              <td className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${color}`}>
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

function EntityColumn({
  title,
  movements,
  borderColor,
  headerBg,
  titleColor,
}: {
  title: string
  movements: MovementWithDetails[]
  borderColor: string
  headerBg: string
  titleColor: string
}) {
  const entradas = movements.filter(m => m.movement_type === 'entrada')
  const salidas  = movements.filter(m => m.movement_type === 'salida')

  return (
    <Card className={`border ${borderColor}`}>
      <CardHeader className={`pb-3 rounded-t-lg border-b ${headerBg}`}>
        <CardTitle className={`text-base ${titleColor}`}>{title}</CardTitle>
        <p className="text-xs text-slate-500">{movements.length} movimiento{movements.length !== 1 ? 's' : ''}</p>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-slate-100">
        {/* Entradas */}
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b border-green-100">
            <ArrowDown className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Entradas ({entradas.length})
            </span>
          </div>
          <MiniTable movements={entradas} type="entrada" />
        </div>
        {/* Salidas */}
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-100">
            <ArrowUp className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              Salidas ({salidas.length})
            </span>
          </div>
          <MiniTable movements={salidas} type="salida" />
        </div>
      </CardContent>
    </Card>
  )
}

export interface KardexColumnsProps {
  insumos: MovementWithDetails[]
  productos: MovementWithDetails[]
  ajustes: MovementWithDetails[]
}

export function KardexColumns({ insumos, productos, ajustes }: KardexColumnsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EntityColumn
          title="Insumos"
          movements={insumos}
          borderColor="border-blue-200"
          headerBg="bg-blue-50 border-blue-100"
          titleColor="text-blue-800"
        />
        <EntityColumn
          title="Productos Terminados"
          movements={productos}
          borderColor="border-purple-200"
          headerBg="bg-purple-50 border-purple-100"
          titleColor="text-purple-800"
        />
      </div>

      {/* Ajustes — sección aparte */}
      <Card className="border border-slate-300">
        <CardHeader className="pb-3 rounded-t-lg border-b bg-slate-50 border-slate-200">
          <CardTitle className="text-base text-slate-700">Ajustes de Inventario</CardTitle>
          <p className="text-xs text-slate-500">{ajustes.length} ajuste{ajustes.length !== 1 ? 's' : ''}</p>
        </CardHeader>
        <CardContent className="p-0">
          {ajustes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin ajustes registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 font-semibold text-slate-500">Fecha</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500">Artículo</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500">Tipo</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500">Motivo</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-500">Cant.</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-500">Costo</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ajustes.map((m) => {
                    const isEntrada = m.movement_type === 'entrada'
                    return (
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
                            <span className="font-medium text-slate-900 truncate max-w-[160px]" title={m.entity_name}>
                              {m.entity_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isEntrada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isEntrada ? '▲ Positivo' : '▼ Negativo'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {movementReasonLabels[m.movement_reason] ?? m.movement_reason}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                          {isEntrada ? '+' : '-'}{m.quantity} {(m.unit as unknown as { symbol: string })?.symbol}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 whitespace-nowrap">
                          {m.total_cost ? formatCurrency(m.total_cost) : '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate" title={m.notes ?? ''}>
                          {m.notes || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
