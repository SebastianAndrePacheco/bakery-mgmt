import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, TrendingUp, Package, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers/currency'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()

  // Obtener datos para los reportes
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0]

  // Total de compras del mes
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select('total')
    .gte('order_date', monthStart)
    .in('status', ['recibido_completo', 'recibido_parcial'])

  const totalPurchases = purchaseOrders?.reduce((sum, po) => sum + po.total, 0) || 0

  // Total de producción del mes
  const { data: productions } = await supabase
    .from('production_orders')
    .select('quantity_produced')
    .gte('production_date', monthStart)
    .eq('status', 'completada')

  const totalProduced = productions?.reduce((sum, p) => sum + (p.quantity_produced || 0), 0) || 0

  // Valor de inventario actual
  const { data: supplyBatches } = await supabase
    .from('supply_batches')
    .select('current_quantity, unit_price')
    .eq('status', 'disponible')

  const supplyInventoryValue = supplyBatches?.reduce(
    (sum, b) => sum + (b.current_quantity * b.unit_price),
    0
  ) || 0

  const { data: productBatches } = await supabase
    .from('production_batches')
    .select('total_cost')
    .eq('status', 'disponible')

  const productInventoryValue = productBatches?.reduce((sum, b) => sum + (b.total_cost || 0), 0) || 0
  const totalInventoryValue = supplyInventoryValue + productInventoryValue

  // Movimientos del mes
  const { count: movementsCount } = await supabase
    .from('inventory_movements')
    .select('*', { count: 'exact', head: true })
    .gte('movement_date', monthStart)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Análisis y estadísticas del negocio
        </p>
      </div>

      {/* Métricas del mes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Compras del Mes</CardDescription>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-blue-600">
              {formatCurrency(totalPurchases)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Producción del Mes</CardDescription>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-purple-600">
              {totalProduced.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Valor Inventario</CardDescription>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(totalInventoryValue)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Movimientos del Mes</CardDescription>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-amber-600">
              {movementsCount || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de reportes disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/reportes/consumo-insumos">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-blue-600" />
                Consumo de Insumos
              </CardTitle>
              <CardDescription>
                Análisis detallado del consumo de insumos por período
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/reportes/costos-produccion">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Costos de Producción
              </CardTitle>
              <CardDescription>
                Costos detallados por producto y por lote
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/reportes/inventario-valorizado">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Inventario Valorizado
              </CardTitle>
              <CardDescription>
                Valor actual del inventario de insumos y productos
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Reportes en Desarrollo</h3>
              <p className="text-sm text-blue-700">
                Próximamente: Rentabilidad por producto, Análisis de compras, Proyección de stock, 
                y más reportes personalizados para tu negocio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
