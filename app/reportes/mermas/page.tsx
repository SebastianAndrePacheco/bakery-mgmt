import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'
import { MonthSelector } from '@/components/ui/month-selector'

export default async function MermasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1

  if (mes) {
    const [y, m] = mes.split('-').map(Number)
    if (y && m) { year = y; month = m }
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]
  const mesLabel = new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*')
    .in('movement_reason', ['merma', 'vencimiento', 'ajuste_inventario'])
    .eq('movement_type', 'salida')
    .gte('movement_date', monthStart)
    .lte('movement_date', monthEnd)
    .order('movement_date', { ascending: false })

  // Obtener names de supplies y products
  const supplyIds = [...new Set((movements || []).filter(m => m.entity_type === 'insumo').map(m => m.entity_id))]
  const productIds = [...new Set((movements || []).filter(m => m.entity_type === 'producto').map(m => m.entity_id))]

  const [{ data: supplies }, { data: products }] = await Promise.all([
    supplyIds.length > 0
      ? supabase.from('supplies').select('id, code, name, unit:units(symbol)').in('id', supplyIds)
      : { data: [] },
    productIds.length > 0
      ? supabase.from('products').select('id, code, name, unit:units(symbol)').in('id', productIds)
      : { data: [] },
  ])

  const suppliesMap = Object.fromEntries((supplies || []).map(s => [s.id, s]))
  const productsMap = Object.fromEntries((products || []).map(p => [p.id, p]))

  const enriched = (movements || []).map(m => ({
    ...m,
    entity: m.entity_type === 'insumo' ? suppliesMap[m.entity_id] : productsMap[m.entity_id],
  }))

  const totalCost = enriched.reduce((s, m) => s + (m.total_cost || 0), 0)
  const totalByReason = {
    merma:             enriched.filter(m => m.movement_reason === 'merma').reduce((s, m) => s + (m.total_cost || 0), 0),
    vencimiento:       enriched.filter(m => m.movement_reason === 'vencimiento').reduce((s, m) => s + (m.total_cost || 0), 0),
    ajuste_inventario: enriched.filter(m => m.movement_reason === 'ajuste_inventario').reduce((s, m) => s + (m.total_cost || 0), 0),
  }

  // Agrupar por insumo/producto para ver cuál genera más merma
  const byEntity: Record<string, { name: string; code: string; unit: string; qty: number; cost: number }> = {}
  for (const m of enriched) {
    if (!m.entity) continue
    const key = m.entity_id
    if (!byEntity[key]) byEntity[key] = { name: m.entity.name, code: m.entity.code, unit: m.entity.unit?.symbol || '', qty: 0, cost: 0 }
    byEntity[key].qty += m.quantity || 0
    byEntity[key].cost += m.total_cost || 0
  }
  const entityList = Object.values(byEntity).sort((a, b) => b.cost - a.cost)

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
    }
  })

  const reasonLabel: Record<string, string> = {
    merma: 'Merma/Deterioro',
    vencimiento: 'Vencimiento',
    ajuste_inventario: 'Ajuste Inventario',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Mermas y Pérdidas</h1>
          <p className="text-muted-foreground capitalize">{mesLabel}</p>
        </div>
        <MonthSelector options={monthOptions} current={mes || monthOptions[0].value} />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Costo Total Perdido</CardDescription>
            <CardTitle className="text-2xl text-red-600">{formatCurrency(totalCost)}</CardTitle>
            <CardDescription className="text-xs">{enriched.length} movimiento(s)</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Merma / Deterioro</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{formatCurrency(totalByReason.merma)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Vencimiento</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{formatCurrency(totalByReason.vencimiento)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ajuste Inventario</CardDescription>
            <CardTitle className="text-2xl text-slate-600">{formatCurrency(totalByReason.ajuste_inventario)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Por insumo/producto */}
      {entityList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Artículos con Más Pérdidas</CardTitle>
            <CardDescription>Ordenado por mayor costo perdido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Código</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Artículo</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad Perdida</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Perdido</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entityList.map((e) => {
                    const pct = totalCost > 0 ? (e.cost / totalCost) * 100 : 0
                    return (
                      <tr key={e.code} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-sm text-slate-600">{e.code}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{e.name}</td>
                        <td className="py-3 px-4 text-right text-red-600 font-semibold">
                          {e.qty.toFixed(3)} {e.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {formatCurrency(e.cost)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle de movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Detalle de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enriched.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No hay mermas o ajustes registrados en este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Artículo</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Motivo</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enriched.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">{formatDate(m.movement_date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{m.entity?.name || '—'}</div>
                        <div className="text-xs text-slate-500">{m.entity?.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          m.movement_reason === 'merma' ? 'bg-orange-100 text-orange-700' :
                          m.movement_reason === 'vencimiento' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {reasonLabel[m.movement_reason] || m.movement_reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 font-semibold">
                        -{(m.quantity || 0).toFixed(3)} {m.entity?.unit?.symbol}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {m.total_cost ? formatCurrency(m.total_cost) : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
