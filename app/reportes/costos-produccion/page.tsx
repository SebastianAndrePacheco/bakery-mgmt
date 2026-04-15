import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'
import { MonthSelector } from '@/components/ui/month-selector'
import { ExportButton } from '@/components/ui/export-button'

export default async function CostosProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const supabase = await createClient()

  // Build month options (last 6 months)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const value = d.toISOString().split('T')[0].slice(0, 7) // YYYY-MM
    const label = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    return { value, label }
  })

  const selectedMonth = mes || monthOptions[0].value
  const monthStart = `${selectedMonth}-01`
  const [year, month] = selectedMonth.split('-').map(Number)
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd = nextMonth

  const selectedLabel = monthOptions.find(o => o.value === selectedMonth)?.label
    || new Date(`${selectedMonth}-01`).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  // Fetch completed orders for month
  const { data: orders } = await supabase
    .from('production_orders')
    .select('id')
    .eq('status', 'completada')
    .gte('production_date', monthStart)
    .lt('production_date', monthEnd)

  // Fetch batches for month with product info
  const { data: batches } = await supabase
    .from('production_batches')
    .select(`
      *,
      product:products(id, code, name, unit:units(symbol))
    `)
    .gte('production_date', monthStart)
    .lt('production_date', monthEnd)
    .order('production_date', { ascending: false })

  const totalProduced = batches?.reduce((sum, b) => sum + (b.quantity_produced || 0), 0) || 0
  const totalCost = batches?.reduce((sum, b) => sum + (b.total_cost || 0), 0) || 0
  const avgCostPerUnit = totalProduced > 0 ? totalCost / totalProduced : 0

  // Group by product
  type ProductSummary = {
    id: string
    code: string
    name: string
    unitSymbol: string
    totalQty: number
    totalCost: number
    avgUnitCost: number
  }

  const productMap = new Map<string, ProductSummary>()
  for (const batch of batches || []) {
    const pid = batch.product?.id
    if (!pid) continue
    const existing = productMap.get(pid)
    if (existing) {
      existing.totalQty += batch.quantity_produced || 0
      existing.totalCost += batch.total_cost || 0
      existing.avgUnitCost = existing.totalQty > 0 ? existing.totalCost / existing.totalQty : 0
    } else {
      const qty = batch.quantity_produced || 0
      const cost = batch.total_cost || 0
      productMap.set(pid, {
        id: pid,
        code: batch.product?.code || '',
        name: batch.product?.name || '',
        unitSymbol: batch.product?.unit?.symbol || '',
        totalQty: qty,
        totalCost: cost,
        avgUnitCost: qty > 0 ? cost / qty : 0,
      })
    }
  }

  const productSummaries = Array.from(productMap.values())
    .sort((a, b) => b.totalCost - a.totalCost)

  const exportData = (batches ?? []).map(b => ({
    fecha: b.production_date,
    lote: b.batch_code,
    producto: (b as unknown as { product?: { name?: string } | null }).product?.name ?? '',
    codigo: (b as unknown as { product?: { code?: string } | null }).product?.code ?? '',
    cantidad: (b.quantity_produced ?? 0).toFixed(2),
    unidad: (b as unknown as { product?: { unit?: { symbol?: string } | null } | null }).product?.unit?.symbol ?? '',
    costo_unitario: b.unit_cost ? b.unit_cost.toFixed(4) : '',
    costo_total: b.total_cost ? b.total_cost.toFixed(2) : '',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Costos de Producción</h1>
          <p className="text-muted-foreground">
            Análisis de {selectedLabel}
          </p>
        </div>
        <ExportButton
          filename={`costos_produccion_${selectedMonth}`}
          columns={[
            { label: 'Fecha', key: 'fecha' },
            { label: 'Lote', key: 'lote' },
            { label: 'Producto', key: 'producto' },
            { label: 'Código', key: 'codigo' },
            { label: 'Cantidad', key: 'cantidad' },
            { label: 'Unidad', key: 'unidad' },
            { label: 'Costo Unit. (S/)', key: 'costo_unitario' },
            { label: 'Costo Total (S/)', key: 'costo_total' },
          ]}
          data={exportData}
        />
        <MonthSelector options={monthOptions} current={selectedMonth} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Producido</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              {totalProduced.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Costo Total</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(totalCost)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Costo Promedio / Unidad</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {formatCurrency(avgCostPerUnit)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Órdenes Completadas</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {orders?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Per-product summary */}
      {productSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Resumen por Producto
            </CardTitle>
            <CardDescription>
              Costo total y costo unitario promedio por producto — ordenado por mayor costo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Producto</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Cant. Producida</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Unit. Prom.</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productSummaries.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{p.code}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-600">
                        {p.totalQty.toFixed(2)} {p.unitSymbol}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 text-sm">
                        {formatCurrency(p.avgUnitCost)}/{p.unitSymbol}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatCurrency(p.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right">TOTAL:</td>
                    <td className="py-3 px-4 text-right text-lg">{formatCurrency(totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Detalle de Lotes Producidos
          </CardTitle>
          <CardDescription>
            Costo calculado por lote con FIFO
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!batches || batches.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No hay producción registrada en {selectedLabel}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Lote</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Producto</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Unit.</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(batches ?? []).map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatDate(batch.production_date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-slate-900">
                          {batch.batch_code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {batch.product?.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {batch.product?.code}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-purple-600">
                          {batch.quantity_produced.toFixed(2)} {batch.product?.unit?.symbol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-slate-700">
                          {batch.unit_cost ? formatCurrency(batch.unit_cost) : '-'}/{batch.product?.unit?.symbol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-slate-900">
                          {batch.total_cost ? formatCurrency(batch.total_cost) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right">TOTAL:</td>
                    <td className="py-3 px-4 text-right text-purple-600">
                      {totalProduced.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      Promedio: {formatCurrency(avgCostPerUnit)}
                    </td>
                    <td className="py-3 px-4 text-right text-lg">
                      {formatCurrency(totalCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
