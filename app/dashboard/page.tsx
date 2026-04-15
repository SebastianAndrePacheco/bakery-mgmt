import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { formatCurrency } from '@/utils/helpers/currency'
import Link from 'next/link'
import { PurchasesProductionChart } from '@/components/charts/purchases-production-chart'
import { InventoryDonutChart } from '@/components/charts/inventory-donut-chart'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toISOString().split('T')[0]

  // Queries paralelas — sin N+1
  const [
    { count: totalSupplies },
    { data: supplies },
    { data: pendingOrders },
    { count: receivedToday },
    { count: movementsToday },
    { count: productionsToday },
    { data: inventoryAgg },
    { data: recentPurchases },
    { data: recentProductions },
    { data: categoryBatches },
  ] = await Promise.all([
    supabase.from('supplies').select('*', { count: 'exact', head: true }).eq('is_active', true),

    supabase.from('supplies')
      .select('id, name, min_stock, unit:units(symbol)')
      .eq('is_active', true),

    supabase.from('purchase_orders')
      .select('id, order_number, total, expected_delivery_date, supplier:suppliers(business_name)')
      .in('status', ['pendiente', 'enviado'])
      .order('expected_delivery_date', { ascending: true })
      .limit(5),

    supabase.from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .gte('actual_delivery_date', today),

    supabase.from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .gte('movement_date', today),

    supabase.from('production_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completada')
      .eq('production_date', today),

    supabase.from('supply_batches')
      .select('current_quantity, unit_price')
      .eq('status', 'disponible')
      .gt('current_quantity', 0),

    // Para gráfica: compras por semana (últimas 8 semanas)
    supabase.from('purchase_orders')
      .select('order_date, total')
      .gte('order_date', eightWeeksAgo)
      .in('status', ['recibido_completo', 'recibido_parcial', 'pendiente', 'enviado']),

    // Para gráfica: costo de producción por semana
    supabase.from('production_batches')
      .select('production_date, total_cost')
      .gte('production_date', eightWeeksAgo),

    // Para donut: valor de inventario por categoría
    supabase.from('supply_batches')
      .select('current_quantity, unit_price, supply:supplies(category:categories(name))')
      .eq('status', 'disponible')
      .gt('current_quantity', 0),
  ])

  // Stock por insumo: una sola query batch en lugar de N queries
  const supplyIds = (supplies || []).map(s => s.id)
  const { data: batchTotals } = supplyIds.length > 0
    ? await supabase
        .from('supply_batches')
        .select('supply_id, current_quantity')
        .in('supply_id', supplyIds)
        .eq('status', 'disponible')
    : { data: [] }

  const stockMap = (batchTotals || []).reduce<Record<string, number>>((acc, b) => {
    acc[b.supply_id] = (acc[b.supply_id] || 0) + (b.current_quantity || 0)
    return acc
  }, {})

  let criticalStock = 0
  let lowStock = 0
  const suppliesWithStock = (supplies || []).map(s => {
    const currentStock = stockMap[s.id] || 0
    if (currentStock < s.min_stock * 0.5) criticalStock++
    else if (currentStock < s.min_stock) lowStock++
    return { ...s, current_stock: currentStock }
  })

  const lowStockSupplies = suppliesWithStock
    .filter(s => s.current_stock < s.min_stock)
    .sort((a, b) => (a.current_stock / a.min_stock) - (b.current_stock / b.min_stock))
    .slice(0, 5)

  const inventoryValue = (inventoryAgg || []).reduce(
    (sum, b) => sum + (b.current_quantity * b.unit_price), 0
  )

  // ── Chart data: purchases vs production cost per week ──────────────────────
  const getWeekKey = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return monday.toISOString().split('T')[0]
  }
  const weekMap = new Map<string, { compras: number; produccion: number }>()
  for (const po of recentPurchases || []) {
    const k = getWeekKey(po.order_date)
    const e = weekMap.get(k) ?? { compras: 0, produccion: 0 }
    e.compras += po.total || 0
    weekMap.set(k, e)
  }
  for (const pb of recentProductions || []) {
    const k = getWeekKey(pb.production_date)
    const e = weekMap.get(k) ?? { compras: 0, produccion: 0 }
    e.produccion += pb.total_cost || 0
    weekMap.set(k, e)
  }
  const chartData = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week: new Date(week + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
      compras: Math.round(v.compras * 100) / 100,
      produccion: Math.round(v.produccion * 100) / 100,
    }))

  // ── Donut: inventory value by category ─────────────────────────────────────
  const categoryMap = new Map<string, number>()
  for (const b of categoryBatches || []) {
    const cat = (b.supply as unknown as { category?: { name: string } | null })?.category?.name ?? 'Sin categoría'
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + (b.current_quantity * b.unit_price))
  }
  const donutData = [...categoryMap.entries()]
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vista general del sistema de gestión</p>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insumos Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSupplies || 0}</div>
            <p className="text-xs text-muted-foreground">Tipos de insumos en catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Esperando recepción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryValue)}</div>
            <p className="text-xs text-muted-foreground">Stock disponible valorizado</p>
          </CardContent>
        </Card>

        <Card className={criticalStock > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${criticalStock > 0 ? 'text-red-700' : ''}`}>
              Alertas de Stock
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${criticalStock > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${criticalStock > 0 ? 'text-red-600' : ''}`}>
              {criticalStock + lowStock}
            </div>
            <p className="text-xs text-muted-foreground">
              Crítico: {criticalStock} | Bajo: {lowStock}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas + Órdenes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Stock Bajo</CardTitle>
            <CardDescription>Insumos que requieren reposición urgente</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockSupplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">✅ No hay insumos con stock bajo</p>
            ) : (
              <div className="space-y-3">
                {lowStockSupplies.map((supply) => {
                  const isCritical = supply.current_stock < supply.min_stock * 0.5
                  const percentage = supply.min_stock > 0
                    ? (supply.current_stock / supply.min_stock) * 100
                    : 0
                  return (
                    <Link
                      key={supply.id}
                      href="/inventario/insumos"
                      className="block hover:bg-slate-50 p-3 rounded-lg border border-slate-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{supply.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isCritical ? 'CRÍTICO' : 'BAJO'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {supply.current_stock.toFixed(2)} / {supply.min_stock} {(supply.unit as unknown as { symbol: string })?.symbol}
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                          {percentage.toFixed(0)}%
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Órdenes Pendientes</CardTitle>
            <CardDescription>Órdenes de compra por recibir</CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingOrders || pendingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay órdenes pendientes</p>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/compras/ordenes/${order.id}`}
                    className="block hover:bg-slate-50 p-3 rounded-lg border border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{order.order_number}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {(order.supplier as unknown as { business_name: string })?.business_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(order.total)}
                        </div>
                        {order.expected_delivery_date && (
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {new Date(order.expected_delivery_date).toLocaleDateString('es-PE')}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividad de hoy */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad de Hoy</CardTitle>
          <CardDescription>Resumen de movimientos del día</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{receivedToday || 0}</div>
              <div className="text-sm text-green-600 mt-1">Órdenes Recibidas</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{movementsToday || 0}</div>
              <div className="text-sm text-blue-600 mt-1">Movimientos Kardex</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">{productionsToday || 0}</div>
              <div className="text-sm text-purple-600 mt-1">Producciones</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compras vs Costo de Producción</CardTitle>
            <CardDescription>Últimas 8 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <PurchasesProductionChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventario por Categoría</CardTitle>
            <CardDescription>Valor actual de insumos en stock</CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryDonutChart data={donutData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
