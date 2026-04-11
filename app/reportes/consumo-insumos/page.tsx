import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'

export default async function ConsumoInsumosPage() {
  const supabase = await createClient()

  // Obtener consumo del mes actual
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Primero obtener los movimientos
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('movement_type', 'salida')
    .eq('movement_reason', 'produccion')
    .eq('entity_type', 'insumo')
    .gte('movement_date', monthStart)

  // Obtener todos los supplies
  const { data: supplies } = await supabase
    .from('supplies')
    .select('id, code, name, unit:units(symbol)')

  // Crear un map de supplies por ID
  const suppliesMap = supplies?.reduce((acc: any, supply: any) => {
    acc[supply.id] = supply
    return acc
  }, {}) || {}

  // Combinar manualmente
  const consumptions = movements?.map(m => ({
    ...m,
    supply: suppliesMap[m.entity_id]
  })).filter(m => m.supply) || []

  // Agrupar por insumo
  const consumptionBySupply = consumptions.reduce((acc: any, movement: any) => {
    const supplyId = movement.entity_id
    if (!acc[supplyId]) {
      acc[supplyId] = {
        supply: movement.supply,
        total_quantity: 0,
        total_cost: 0,
        movements: 0
      }
    }
    acc[supplyId].total_quantity += movement.quantity
    acc[supplyId].total_cost += movement.total_cost || 0
    acc[supplyId].movements += 1
    return acc
  }, {})

  const consumptionList = Object.values(consumptionBySupply).sort(
    (a: any, b: any) => b.total_cost - a.total_cost
  )

  const totalCost = consumptionList.reduce((sum: number, item: any) => sum + item.total_cost, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Consumo de Insumos</h1>
          <p className="text-muted-foreground">
            Análisis del mes actual ({new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })})
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Consumido</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {formatCurrency(totalCost)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Insumos Diferentes</CardDescription>
            <CardTitle className="text-3xl text-purple-600">
              {consumptionList.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Movimientos</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {consumptions.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla de consumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Detalle de Consumo por Insumo
          </CardTitle>
          <CardDescription>
            Ordenado por mayor costo consumido
          </CardDescription>
        </CardHeader>
        <CardContent>
          {consumptionList.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No hay consumos registrados este mes</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Código</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Insumo</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Promedio</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Movimientos</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consumptionList.map((item: any) => {
                    const avgCost = item.total_quantity > 0 ? item.total_cost / item.total_quantity : 0
                    const percentage = totalCost > 0 ? (item.total_cost / totalCost) * 100 : 0

                    return (
                      <tr key={item.supply.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-slate-600">
                            {item.supply.code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-900">
                            {item.supply.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-red-600 font-semibold">
                            {item.total_quantity.toFixed(3)} {item.supply.unit?.symbol}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(item.total_cost)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-slate-600">
                            {formatCurrency(avgCost)}/{item.supply.unit?.symbol}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-slate-600">
                            {item.movements}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-red-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-700 w-12 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right">
                      TOTAL:
                    </td>
                    <td className="py-3 px-4 text-right text-lg">
                      {formatCurrency(totalCost)}
                    </td>
                    <td colSpan={3}></td>
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
