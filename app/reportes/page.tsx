import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Package, DollarSign, Calendar, ShoppingCart, Trash2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers/currency'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0]

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

  const [
    { data: purchaseOrders },
    { data: productions },
    { data: supplyBatches },
    { data: productBatches },
    { count: movementsCount },
    { data: expiringBatches },
    { data: productionMovements },
  ] = await Promise.all([
    supabase.from('purchase_orders').select('total').gte('order_date', monthStart).in('status', ['recibido_completo', 'recibido_parcial']),
    supabase.from('production_orders').select('quantity_produced').gte('production_date', monthStart).eq('status', 'completada'),
    supabase.from('supply_batches').select('current_quantity, unit_price').eq('status', 'disponible'),
    supabase.from('production_batches').select('total_cost').eq('status', 'disponible'),
    supabase.from('inventory_movements').select('*', { count: 'exact', head: true }).gte('movement_date', monthStart),
    supabase.from('supply_batches').select('id').eq('status', 'disponible').gt('current_quantity', 0).not('expiration_date', 'is', null).lte('expiration_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]),
    supabase.from('inventory_movements')
      .select('entity_id, quantity, movement_date')
      .eq('movement_type', 'salida')
      .eq('movement_reason', 'produccion')
      .eq('entity_type', 'insumo')
      .gte('movement_date', ninetyDaysAgo)
      .order('movement_date', { ascending: true }),
  ])

  const totalPurchases = purchaseOrders?.reduce((sum, po) => sum + (po.total || 0), 0) || 0
  const totalProduced = productions?.reduce((sum, p) => sum + (p.quantity_produced || 0), 0) || 0
  const supplyValue = supplyBatches?.reduce((sum, b) => sum + (b.current_quantity * b.unit_price), 0) || 0
  const productValue = productBatches?.reduce((sum, b) => sum + (b.total_cost || 0), 0) || 0
  const totalInventoryValue = supplyValue + productValue
  const criticalBatches = expiringBatches?.length || 0

  // Compute critical supplies for inventory projection badge
  const todayTs = new Date()
  todayTs.setHours(0, 0, 0, 0)
  const movAgg = new Map<string, { totalQty: number; oldestDate: Date }>()
  for (const mov of productionMovements || []) {
    const existing = movAgg.get(mov.entity_id)
    const movDate = new Date(mov.movement_date)
    if (existing) {
      existing.totalQty += mov.quantity || 0
      if (movDate < existing.oldestDate) existing.oldestDate = movDate
    } else {
      movAgg.set(mov.entity_id, { totalQty: mov.quantity || 0, oldestDate: movDate })
    }
  }
  // We need stock per supply to compute days remaining; approximate with a simple count of critical
  // (supplies where avg daily consumption * 7 > 0 and we cannot easily get stock here without extra query)
  // Instead: compute critical count as supplies where oldest movement >= 7 days and high consumption rate
  // For simplicity, fetch supply stocks for flagged supplies
  const projSupplyIds = [...movAgg.keys()]
  const { data: projStockBatches } = projSupplyIds.length > 0
    ? await supabase
        .from('supply_batches')
        .select('supply_id, current_quantity')
        .in('supply_id', projSupplyIds)
        .eq('status', 'disponible')
    : { data: [] }
  const projStockBySupply = new Map<string, number>()
  for (const b of projStockBatches || []) {
    projStockBySupply.set(b.supply_id, (projStockBySupply.get(b.supply_id) || 0) + (b.current_quantity || 0))
  }
  let criticalSupplies = 0
  for (const [supplyId, agg] of movAgg.entries()) {
    const periodDays = Math.max(7, Math.floor((todayTs.getTime() - agg.oldestDate.getTime()) / 86400000))
    const avgDaily = agg.totalQty / periodDays
    if (avgDaily <= 0) continue
    const stock = projStockBySupply.get(supplyId) || 0
    const daysRemaining = stock / avgDaily
    if (daysRemaining < 7) criticalSupplies++
  }

  const reportes = [
    {
      href: '/reportes/consumo-insumos',
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      title: 'Consumo de Insumos',
      desc: 'Qué insumos se consumen más y cuánto cuestan',
    },
    {
      href: '/reportes/costos-produccion',
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      title: 'Costos de Producción',
      desc: 'Costo por lote y costo unitario de cada producto',
    },
    {
      href: '/reportes/inventario-valorizado',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      title: 'Inventario Valorizado',
      desc: 'Valor actual de insumos y productos en stock',
    },
    {
      href: '/reportes/compras-proveedor',
      icon: ShoppingCart,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      title: 'Compras por Proveedor',
      desc: 'Cuánto compramos a cada proveedor por mes',
    },
    {
      href: '/reportes/mermas',
      icon: Trash2,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      title: 'Mermas y Pérdidas',
      desc: 'Control de deterioro, vencimientos y ajustes negativos',
    },
    {
      href: '/reportes/vencimientos',
      icon: AlertTriangle,
      color: criticalBatches > 0 ? 'text-red-600' : 'text-yellow-600',
      bg: criticalBatches > 0 ? 'bg-red-50' : 'bg-yellow-50',
      title: 'Control de Vencimientos',
      desc: 'Lotes próximos a vencer en los próximos 30 días',
      badge: criticalBatches > 0 ? criticalBatches : undefined,
    },
    {
      href: '/reportes/proyeccion-inventario',
      icon: TrendingUp,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      title: 'Proyección de Inventario',
      desc: 'Estimación de agotamiento y sugerencias de compra por insumo',
      badge: criticalSupplies > 0 ? criticalSupplies : undefined,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Panificadora Ofelia E.I.R.L. — RUC 20452630371
        </p>
      </div>

      {/* Métricas del mes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Compras del Mes</CardDescription>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-blue-600">{formatCurrency(totalPurchases)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Producción del Mes</CardDescription>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-purple-600">{totalProduced.toFixed(0)} und.</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Valor Inventario</CardDescription>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(totalInventoryValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={criticalBatches > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className={criticalBatches > 0 ? 'text-red-700' : ''}>Lotes por Vencer</CardDescription>
              <AlertTriangle className={`w-4 h-4 ${criticalBatches > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            </div>
            <CardTitle className={`text-2xl ${criticalBatches > 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {criticalBatches}
            </CardTitle>
            <CardDescription className="text-xs">en los próximos 7 días</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Reportes disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportes.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${r.bg} w-fit`}>
                    <r.icon className={`w-5 h-5 ${r.color}`} />
                  </div>
                  {r.badge !== undefined && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {r.badge}
                    </span>
                  )}
                </div>
                <CardTitle className="text-base mt-2">{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
