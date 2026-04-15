import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'
import { ExportButton } from '@/components/ui/export-button'

type Urgency = 'critico' | 'pronto' | 'ok'

interface ProjectionItem {
  supplyId: string
  code: string
  name: string
  unitSymbol: string
  currentStock: number
  avgDailyConsumption: number
  daysRemaining: number
  stockoutDate: Date | null
  suggestedOrderQty: number
  urgency: Urgency
}

export default async function ProyeccionInventarioPage() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

  // 1. Fetch movements
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('entity_id, quantity, movement_date')
    .eq('movement_type', 'salida')
    .eq('movement_reason', 'produccion')
    .eq('entity_type', 'insumo')
    .gte('movement_date', ninetyDaysAgo)
    .order('movement_date', { ascending: true })

  // Check if we have enough history (oldest movement at least 7 days old)
  const hasMovements = movements && movements.length > 0
  const oldestDate = hasMovements
    ? new Date(movements[0].movement_date)
    : null

  const daysSinceOldest = oldestDate
    ? Math.floor((today.getTime() - oldestDate.getTime()) / 86400000)
    : 0

  if (!hasMovements || daysSinceOldest < 7) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/reportes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Proyección de Inventario</h1>
            <p className="text-muted-foreground">Estimación de agotamiento y sugerencias de compra</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Datos insuficientes
            </CardTitle>
            <CardDescription>
              Se necesitan al menos 7 días de historial de producción para generar proyecciones
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // 2. Get supply IDs and fetch supplies
  const supplyIds = [...new Set((movements || []).map(m => m.entity_id))]

  const { data: supplies } = await supabase
    .from('supplies')
    .select('id, code, name, unit:units(symbol)')
    .in('id', supplyIds)

  // 3. Fetch current stock
  const { data: stockBatches } = supplyIds.length > 0
    ? await supabase
        .from('supply_batches')
        .select('supply_id, current_quantity')
        .in('supply_id', supplyIds)
        .eq('status', 'disponible')
    : { data: [] }

  // Aggregate stock per supply
  const stockBySupply = new Map<string, number>()
  for (const batch of stockBatches || []) {
    stockBySupply.set(
      batch.supply_id,
      (stockBySupply.get(batch.supply_id) || 0) + (batch.current_quantity || 0)
    )
  }

  // Aggregate movements per supply
  type MovementAgg = { totalQty: number; oldestDate: Date }
  const movementsBySupply = new Map<string, MovementAgg>()
  for (const mov of movements || []) {
    const existing = movementsBySupply.get(mov.entity_id)
    const movDate = new Date(mov.movement_date)
    if (existing) {
      existing.totalQty += mov.quantity || 0
      if (movDate < existing.oldestDate) existing.oldestDate = movDate
    } else {
      movementsBySupply.set(mov.entity_id, {
        totalQty: mov.quantity || 0,
        oldestDate: movDate,
      })
    }
  }

  // Build projections
  const projections: ProjectionItem[] = []

  for (const supply of supplies || []) {
    const agg = movementsBySupply.get(supply.id)
    if (!agg) continue

    const periodDays = Math.max(
      7,
      Math.floor((today.getTime() - agg.oldestDate.getTime()) / 86400000)
    )
    const avgDailyConsumption = agg.totalQty / periodDays
    const currentStock = stockBySupply.get(supply.id) || 0

    let daysRemaining: number
    let stockoutDate: Date | null

    if (avgDailyConsumption <= 0) {
      daysRemaining = Infinity
      stockoutDate = null
    } else {
      daysRemaining = currentStock / avgDailyConsumption
      stockoutDate = new Date(today.getTime() + daysRemaining * 86400000)
    }

    const suggestedOrderQty = Math.max(
      0,
      (avgDailyConsumption * 30) - currentStock
    )

    let urgency: Urgency
    if (daysRemaining < 7) {
      urgency = 'critico'
    } else if (daysRemaining <= 21) {
      urgency = 'pronto'
    } else {
      urgency = 'ok'
    }

    projections.push({
      supplyId: supply.id,
      code: supply.code || '',
      name: supply.name || '',
      unitSymbol: (supply.unit as unknown as { symbol: string } | null)?.symbol || '',
      currentStock,
      avgDailyConsumption,
      daysRemaining,
      stockoutDate,
      suggestedOrderQty,
      urgency,
    })
  }

  // Sort by days remaining ascending (most urgent first, Infinity last)
  projections.sort((a, b) => {
    if (!isFinite(a.daysRemaining) && !isFinite(b.daysRemaining)) return 0
    if (!isFinite(a.daysRemaining)) return 1
    if (!isFinite(b.daysRemaining)) return -1
    return a.daysRemaining - b.daysRemaining
  })

  const criticoCount = projections.filter(p => p.urgency === 'critico').length
  const prontoCount = projections.filter(p => p.urgency === 'pronto').length
  const okCount = projections.filter(p => p.urgency === 'ok').length
  const urgentItems = projections.filter(p => p.urgency === 'critico' || p.urgency === 'pronto')

  const exportData = projections.map(p => ({
    codigo: p.code,
    insumo: p.name,
    stock_actual: p.currentStock.toFixed(2),
    unidad: p.unitSymbol,
    consumo_diario_prom: p.avgDailyConsumption.toFixed(3),
    dias_restantes: isFinite(p.daysRemaining) ? Math.floor(p.daysRemaining) : 'Sin datos',
    fecha_agotamiento: p.stockoutDate ? p.stockoutDate.toISOString().split('T')[0] : 'Sin datos',
    cantidad_sugerida: p.suggestedOrderQty.toFixed(2),
    urgencia: p.urgency,
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
          <h1 className="text-3xl font-bold">Proyección de Inventario</h1>
          <p className="text-muted-foreground">
            Estimación de agotamiento y sugerencias de compra por insumo
          </p>
        </div>
        <ExportButton
          filename="proyeccion_inventario"
          columns={[
            { label: 'Código', key: 'codigo' },
            { label: 'Insumo', key: 'insumo' },
            { label: 'Stock Actual', key: 'stock_actual' },
            { label: 'Unidad', key: 'unidad' },
            { label: 'Consumo Diario Prom.', key: 'consumo_diario_prom' },
            { label: 'Días Restantes', key: 'dias_restantes' },
            { label: 'Fecha Agotamiento', key: 'fecha_agotamiento' },
            { label: 'Cant. Sugerida', key: 'cantidad_sugerida' },
            { label: 'Urgencia', key: 'urgencia' },
          ]}
          data={exportData}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={criticoCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="pb-3">
            <CardDescription className={criticoCount > 0 ? 'text-red-700' : ''}>
              Insumos Críticos
            </CardDescription>
            <CardTitle className={`text-2xl ${criticoCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {criticoCount}
            </CardTitle>
            <CardDescription className="text-xs">menos de 7 días de stock</CardDescription>
          </CardHeader>
        </Card>
        <Card className={prontoCount > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardHeader className="pb-3">
            <CardDescription className={prontoCount > 0 ? 'text-yellow-700' : ''}>
              Pedir Pronto
            </CardDescription>
            <CardTitle className={`text-2xl ${prontoCount > 0 ? 'text-yellow-600' : 'text-slate-600'}`}>
              {prontoCount}
            </CardTitle>
            <CardDescription className="text-xs">entre 7 y 21 días de stock</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-700">Stock OK</CardDescription>
            <CardTitle className="text-2xl text-green-600">{okCount}</CardTitle>
            <CardDescription className="text-xs">más de 21 días de stock</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Purchase suggestions */}
      {urgentItems.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Sugerencias de Compra
            </CardTitle>
            <CardDescription>
              Insumos críticos o que necesitan reposición pronto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-orange-100 mb-4">
              <table className="w-full">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Insumo</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Días Restantes</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad Sugerida</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  {urgentItems.map((item) => (
                    <tr key={item.supplyId} className="hover:bg-orange-50/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.code}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {isFinite(item.daysRemaining) ? Math.round(item.daysRemaining) : '∞'} días
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-slate-900">
                          {item.suggestedOrderQty.toFixed(2)} {item.unitSymbol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.urgency === 'critico' ? (
                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            CRÍTICO
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            PRONTO
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Considera crear una Orden de Compra para estos insumos
            </p>
            <Link href="/compras/ordenes/nueva">
              <Button variant="outline" size="sm">
                Nueva Orden de Compra
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main projection table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Proyección por Insumo
          </CardTitle>
          <CardDescription>
            Basado en el consumo de producción de los últimos 90 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projections.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No hay datos de consumo de insumos</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Insumo</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Stock Actual</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Consumo/día</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Días Restantes</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Fecha Est. Agotamiento</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Pedido Sugerido (30 días)</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projections.map((item) => (
                    <tr key={item.supplyId} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.code}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {item.currentStock.toFixed(2)} {item.unitSymbol}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {item.avgDailyConsumption.toFixed(2)} {item.unitSymbol}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {isFinite(item.daysRemaining) ? Math.round(item.daysRemaining) : '∞'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 text-sm">
                        {item.stockoutDate ? formatDate(item.stockoutDate.toISOString().split('T')[0]) : 'Sin agotamiento'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-slate-900">
                          {item.suggestedOrderQty.toFixed(2)} {item.unitSymbol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.urgency === 'critico' ? (
                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            CRÍTICO
                          </span>
                        ) : item.urgency === 'pronto' ? (
                          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            PRONTO
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            OK
                          </span>
                        )}
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
