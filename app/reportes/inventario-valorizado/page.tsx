import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, Package, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'

export default async function InventarioValorizadoPage() {
  const supabase = await createClient()

  // Valor de insumos
  const { data: supplyBatches } = await supabase
    .from('supply_batches')
    .select(`
      *,
      supply:supplies(id, code, name, category:categories(name), unit:units(symbol))
    `)
    .eq('status', 'disponible')
    .gt('current_quantity', 0)

  const supplyValue = supplyBatches?.reduce(
    (sum, b) => sum + (b.current_quantity * b.unit_price),
    0
  ) || 0

  // Agrupar insumos por categoría
  const suppliesByCategory = supplyBatches?.reduce((acc: any, batch: any) => {
    const category = batch.supply?.category?.name || 'Sin categoría'
    if (!acc[category]) {
      acc[category] = {
        category,
        batches: [],
        total_quantity: 0,
        total_value: 0
      }
    }
    const batchValue = batch.current_quantity * batch.unit_price
    acc[category].batches.push({ ...batch, value: batchValue })
    acc[category].total_value += batchValue
    return acc
  }, {}) || {}

  const supplyCategoryList = Object.values(suppliesByCategory).sort(
    (a: any, b: any) => b.total_value - a.total_value
  )

  // Valor de productos terminados
  const { data: productBatches } = await supabase
    .from('production_batches')
    .select(`
      *,
      product:products(id, code, name, unit:units(symbol))
    `)
    .eq('status', 'disponible')
    .gt('current_quantity', 0)

  const productValue = productBatches?.reduce((sum, b) => sum + (b.total_cost || 0), 0) || 0

  const totalInventoryValue = supplyValue + productValue

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Inventario Valorizado</h1>
          <p className="text-muted-foreground">
            Valor actual del inventario al {new Date().toLocaleDateString('es-PE')}
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Insumos</CardDescription>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-blue-600">
              {formatCurrency(supplyValue)}
            </CardTitle>
            <CardDescription className="text-xs">
              {supplyBatches?.length || 0} lotes disponibles
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Productos Terminados</CardDescription>
              <ShoppingBag className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-purple-600">
              {formatCurrency(productValue)}
            </CardTitle>
            <CardDescription className="text-xs">
              {productBatches?.length || 0} lotes disponibles
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700">Total Inventario</CardDescription>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-700">
              {formatCurrency(totalInventoryValue)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Insumos por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Insumos por Categoría
          </CardTitle>
          <CardDescription>
            Valor de inventario agrupado por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supplyCategoryList.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No hay insumos en inventario</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplyCategoryList.map((cat: any) => (
                <div key={cat.category} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg text-slate-900">{cat.category}</h3>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(cat.total_value)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium">Código</th>
                          <th className="text-left py-2 px-3 font-medium">Insumo</th>
                          <th className="text-right py-2 px-3 font-medium">Stock</th>
                          <th className="text-right py-2 px-3 font-medium">Precio Unit.</th>
                          <th className="text-right py-2 px-3 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cat.batches.map((batch: any) => (
                          <tr key={batch.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {batch.supply.code}
                            </td>
                            <td className="py-2 px-3 text-slate-900">
                              {batch.supply.name}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700">
                              {batch.current_quantity.toFixed(2)} {batch.supply.unit?.symbol}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatCurrency(batch.unit_price)}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              {formatCurrency(batch.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Productos Terminados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Productos Terminados
          </CardTitle>
          <CardDescription>
            Lotes de productos en inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!productBatches || productBatches.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No hay productos terminados en inventario</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Lote</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Producto</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Cantidad</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Costo Unit.</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productBatches.map((batch: any) => (
                    <tr key={batch.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-sm text-slate-900">
                        {batch.batch_code}
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
                          {batch.current_quantity.toFixed(2)} {batch.product?.unit?.symbol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-700">
                        {batch.unit_cost ? formatCurrency(batch.unit_cost) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {batch.total_cost ? formatCurrency(batch.total_cost) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right">
                      TOTAL:
                    </td>
                    <td className="py-3 px-4 text-right text-lg text-purple-600">
                      {formatCurrency(productValue)}
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
