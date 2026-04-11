import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'

export default async function CostosProduccionPage() {
  const supabase = await createClient()

  const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0]

  // Obtener órdenes de producción completadas del mes
  const { data: orders } = await supabase
    .from('production_orders')
    .select(`
      *,
      product:products(id, code, name, unit:units(symbol))
    `)
    .eq('status', 'completada')
    .gte('production_date', monthStart)
    .order('production_date', { ascending: false })

  // Obtener lotes de producción del mes
  const { data: batches } = await supabase
    .from('production_batches')
    .select(`
      *,
      product:products(id, code, name, unit:units(symbol))
    `)
    .gte('production_date', monthStart)
    .order('production_date', { ascending: false })

  const totalProduced = batches?.reduce((sum, b) => sum + b.quantity_produced, 0) || 0
  const totalCost = batches?.reduce((sum, b) => sum + (b.total_cost || 0), 0) || 0
  const avgCostPerUnit = totalProduced > 0 ? totalCost / totalProduced : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Costos de Producción</h1>
          <p className="text-muted-foreground">
            Análisis del mes actual ({new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })})
          </p>
        </div>
      </div>

      {/* Resumen */}
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
            <CardDescription>Costo Promedio</CardDescription>
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

      {/* Tabla de lotes */}
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
              <p className="text-slate-600">No hay producción registrada este mes</p>
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
                  {batches.map((batch: any) => (
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
                    <td colSpan={3} className="py-3 px-4 text-right">
                      TOTAL:
                    </td>
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
