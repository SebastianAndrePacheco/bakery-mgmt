import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Factory, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { formatCurrency } from '@/utils/helpers/currency'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Obtener total de insumos activos
  const { count: totalSupplies } = await supabase
    .from('supplies')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Obtener insumos con stock bajo
  const { data: supplies } = await supabase
    .from('supplies')
    .select('*, category:categories(name), unit:units(symbol)')
    .eq('is_active', true)

  // Calcular stock actual y detectar alertas
  let criticalStock = 0
  let lowStock = 0
  const suppliesWithStock = await Promise.all(
    (supplies || []).map(async (supply) => {
      const { data: batches } = await supabase
        .from('supply_batches')
        .select('current_quantity')
        .eq('supply_id', supply.id)
        .eq('status', 'disponible')

      const currentStock = batches?.reduce((sum, batch) => sum + batch.current_quantity, 0) || 0
      
      if (currentStock < supply.min_stock * 0.5) criticalStock++
      else if (currentStock < supply.min_stock) lowStock++

      return { ...supply, current_stock: currentStock }
    })
  )

  const lowStockSupplies = suppliesWithStock
    .filter(s => s.current_stock < s.min_stock)
    .sort((a, b) => (a.current_stock / a.min_stock) - (b.current_stock / b.min_stock))
    .slice(0, 5)

  // Órdenes de compra pendientes
  const { data: pendingOrders } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(business_name)')
    .in('status', ['pendiente', 'enviado'])
    .order('expected_delivery_date', { ascending: true })
    .limit(5)

  // Órdenes recibidas hoy
  const today = new Date().toISOString().split('T')[0]
  const { count: receivedToday } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .gte('actual_delivery_date', today)

  // Movimientos de hoy
  const { count: movementsToday } = await supabase
    .from('inventory_movements')
    .select('*', { count: 'exact', head: true })
    .gte('movement_date', today)

  // Valor total del inventario (aproximado)
  const { data: allBatches } = await supabase
    .from('supply_batches')
    .select('current_quantity, unit_price')
    .eq('status', 'disponible')

  const inventoryValue = allBatches?.reduce(
    (sum, batch) => sum + (batch.current_quantity * batch.unit_price),
    0
  ) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Vista general del sistema de gestión
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Insumos Activos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSupplies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tipos de insumos en catálogo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Órdenes Pendientes
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Esperando recepción
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Inventario
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryValue)}</div>
            <p className="text-xs text-muted-foreground">
              Stock disponible valorizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Alertas de Stock
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalStock}</div>
            <p className="text-xs text-muted-foreground">
              Crítico: {criticalStock} | Bajo: {lowStock}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones de alertas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Stock Bajo</CardTitle>
            <CardDescription>
              Insumos que requieren reposición urgente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockSupplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ✅ No hay insumos con stock bajo
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockSupplies.map((supply) => {
                  const isCritical = supply.current_stock < supply.min_stock * 0.5
                  const percentage = (supply.current_stock / supply.min_stock) * 100

                  return (
                    <Link 
                      key={supply.id} 
                      href={`/inventario/insumos/${supply.id}/lotes`}
                      className="block hover:bg-slate-50 p-3 rounded-lg border border-slate-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{supply.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              isCritical 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isCritical ? 'CRÍTICO' : 'BAJO'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            Stock: {supply.current_stock.toFixed(2)} {supply.unit?.symbol} / Mínimo: {supply.min_stock} {supply.unit?.symbol}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            isCritical ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {percentage.toFixed(0)}%
                          </div>
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
            <CardDescription>
              Órdenes de compra por recibir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingOrders || pendingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay órdenes pendientes
              </p>
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
                          {order.supplier?.business_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(order.total)}
                        </div>
                        {order.expected_delivery_date && (
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
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

      {/* Actividad reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad de Hoy</CardTitle>
          <CardDescription>
            Resumen de movimientos del día
          </CardDescription>
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
              <div className="text-2xl font-bold text-purple-700">0</div>
              <div className="text-sm text-purple-600 mt-1">Producciones</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
