import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'
import { ArrowDown, ArrowUp, Minus, TrendingUp, TrendingDown, Package } from 'lucide-react'

// ── Labels ────────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  compra:              'Compra',
  produccion:          'Producción',
  merma:               'Merma',
  vencimiento:         'Vencimiento',
  ajuste_inventario:   'Ajuste',
  devolucion_proveedor:'Devolución',
  venta_manual:        'Venta',
}

// ── KardexSummary ─────────────────────────────────────────────────────────────

export interface KardexSummaryRow {
  entity_id: string
  entity_type: string
  name: string
  code: string
  unit_symbol: string
  entries: number
  exits: number
  adjustments: number
  current_qty: number
  current_value: number
}

export function KardexSummary({
  rows,
  mesParam,
}: {
  rows: KardexSummaryRow[]
  mesParam: string
}) {
  const insumos  = rows.filter(r => r.entity_type === 'insumo')
  const products = rows.filter(r => r.entity_type === 'producto')

  return (
    <div className="space-y-6">
      <SummarySection title="Insumos" rows={insumos} mesParam={mesParam} entityType="insumo" />
      <SummarySection title="Productos Terminados" rows={products} mesParam={mesParam} entityType="producto" />
    </div>
  )
}

function SummarySection({
  title,
  rows,
  mesParam,
  entityType,
}: {
  title: string
  rows: KardexSummaryRow[]
  mesParam: string
  entityType: string
}) {
  if (rows.length === 0) return null

  const totalValue = rows.reduce((s, r) => s + r.current_value, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            {title}
          </CardTitle>
          <span className="text-sm font-semibold text-slate-600">
            Valor total: {formatCurrency(totalValue)}
          </span>
        </div>
        <CardDescription>Haz clic en un artículo para ver su Kardex detallado</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Artículo</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Unidad</th>
                <th className="text-right px-4 py-3 font-medium text-green-700">
                  <span className="flex items-center justify-end gap-1">
                    <ArrowDown className="w-3.5 h-3.5" /> Entradas
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-medium text-red-700">
                  <span className="flex items-center justify-end gap-1">
                    <ArrowUp className="w-3.5 h-3.5" /> Salidas
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Saldo Apertura</th>
                <th className="text-right px-4 py-3 font-medium text-slate-900">Stock Actual</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Valor Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const openingBalance = r.current_qty - r.entries + r.exits
                const netChange = r.entries - r.exits
                return (
                  <tr key={r.entity_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventario/kardex?mes=${mesParam}&entity_id=${r.entity_id}&entity_type=${entityType}`}
                        className="group"
                      >
                        <div className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                          {r.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{r.code}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{r.unit_symbol}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {r.entries > 0 ? `+${r.entries.toLocaleString('es-PE', { maximumFractionDigits: 3 })}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {r.exits > 0 ? `-${r.exits.toLocaleString('es-PE', { maximumFractionDigits: 3 })}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {openingBalance.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {r.unit_symbol}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${r.current_qty === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {r.current_qty.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {r.unit_symbol}
                      </span>
                      {netChange !== 0 && (
                        <div className="text-xs mt-0.5 flex items-center justify-end gap-0.5">
                          {netChange > 0
                            ? <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-green-600">+{netChange.toLocaleString('es-PE', { maximumFractionDigits: 3 })}</span></>
                            : <><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-red-600">{netChange.toLocaleString('es-PE', { maximumFractionDigits: 3 })}</span></>
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(r.current_value)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── KardexDetail ──────────────────────────────────────────────────────────────

export interface KardexDetailMovement {
  id: string
  movement_type: string
  movement_reason: string
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  notes: string | null
  movement_date: string
  unit_symbol: string
}

export function KardexDetail({
  movements,
  openingBalance,
  currentStock,
  currentValue,
  unitSymbol,
}: {
  movements: KardexDetailMovement[]
  openingBalance: number
  currentStock: number
  currentValue: number
  unitSymbol: string
}) {
  const periodEntries = movements.reduce((s, m) => m.movement_type === 'entrada' ? s + m.quantity : s, 0)
  const periodExits   = movements.reduce((s, m) => m.movement_type === 'salida'  ? s + m.quantity : s, 0)

  // Compute running balance
  let balance = openingBalance
  const rows = movements.map(m => {
    if (m.movement_type === 'entrada') balance += m.quantity
    else if (m.movement_type === 'salida') balance -= m.quantity
    else balance += m.movement_type === 'entrada' ? m.quantity : -m.quantity
    return { ...m, balance }
  })

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Saldo Apertura</CardDescription>
            <CardTitle className="text-xl text-slate-700">
              {openingBalance.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {unitSymbol}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Entradas del Período</CardDescription>
            <CardTitle className="text-xl text-green-700">
              +{periodEntries.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {unitSymbol}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Salidas del Período</CardDescription>
            <CardTitle className="text-xl text-red-600">
              -{periodExits.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {unitSymbol}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Stock Actual</CardDescription>
            <CardTitle className={`text-xl ${currentStock === 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {currentStock.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {unitSymbol}
            </CardTitle>
            <CardDescription className="text-xs">{formatCurrency(currentValue)}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla Kardex */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movimientos del Período</CardTitle>
          <CardDescription>{movements.length} movimiento{movements.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Sin movimientos en este período
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Concepto</th>
                    <th className="text-right px-4 py-3 font-medium text-green-700 w-32">Entrada</th>
                    <th className="text-right px-4 py-3 font-medium text-red-700 w-32">Salida</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-900 w-36">Saldo</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">Costo Unit.</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Fila de apertura */}
                  <tr className="bg-slate-50 text-slate-500 italic">
                    <td className="px-4 py-2 text-xs">—</td>
                    <td className="px-4 py-2 text-xs">Saldo de apertura</td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-right font-semibold text-slate-700 not-italic">
                      {openingBalance.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {unitSymbol}
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2" />
                  </tr>

                  {rows.map((m) => {
                    const isEntrada = m.movement_type === 'entrada'
                    const isSalida  = m.movement_type === 'salida'
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors align-top">
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          {formatDate(m.movement_date)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {isEntrada
                              ? <ArrowDown className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              : isSalida
                                ? <ArrowUp className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                : <Minus className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            }
                            <span className="text-slate-700">
                              {REASON_LABELS[m.movement_reason] ?? m.movement_reason}
                            </span>
                          </div>
                          {m.notes && (
                            <div className="text-xs text-slate-400 mt-0.5 pl-5">{m.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                          {isEntrada
                            ? `${m.quantity.toLocaleString('es-PE', { maximumFractionDigits: 3 })} ${m.unit_symbol}`
                            : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                          {isSalida
                            ? `${m.quantity.toLocaleString('es-PE', { maximumFractionDigits: 3 })} ${m.unit_symbol}`
                            : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {m.balance.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {unitSymbol}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">
                          {m.unit_cost != null ? formatCurrency(m.unit_cost) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {m.total_cost != null ? formatCurrency(m.total_cost) : '—'}
                        </td>
                      </tr>
                    )
                  })}

                  {/* Fila de cierre */}
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
                    <td className="px-4 py-2 text-xs text-slate-500 italic">—</td>
                    <td className="px-4 py-2 text-xs text-slate-600 italic">Saldo de cierre</td>
                    <td className="px-4 py-2 text-right text-green-700 text-xs">
                      +{periodEntries.toLocaleString('es-PE', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 text-xs">
                      -{periodExits.toLocaleString('es-PE', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-900">
                      {currentStock.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {unitSymbol}
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(currentValue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
