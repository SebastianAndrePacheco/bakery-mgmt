import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Package, ChefHat } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/utils/helpers/dates'
import { RegisterProductionForm } from '@/components/forms/register-production-form'

export default async function ProductionOrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()

  // Obtener la orden
  const { data: order } = await supabase
    .from('production_orders')
    .select(`
      *,
      product:products(
        id,
        code,
        name,
        shelf_life_days,
        unit:units(id, name, symbol)
      )
    `)
    .eq('id', id)
    .single()

  if (!order) {
    notFound()
  }

  // Obtener la receta del producto
  const { data: recipeItems } = await supabase
    .from('product_recipes')
    .select(`
      *,
      supply:supplies(id, code, name, unit:units(symbol)),
      unit:units(id, name, symbol)
    `)
    .eq('product_id', order.product_id)

  // Calcular insumos necesarios
  const ingredientsNeeded = recipeItems?.map(item => ({
    ...item,
    needed: item.quantity * order.quantity_planned
  })) || []

  // Verificar stock disponible para cada ingrediente
  const ingredientsWithStock = await Promise.all(
    ingredientsNeeded.map(async (ingredient) => {
      const { data: batches } = await supabase
        .from('supply_batches')
        .select('current_quantity')
        .eq('supply_id', ingredient.supply.id)
        .eq('status', 'disponible')

      const available = batches?.reduce((sum, b) => sum + b.current_quantity, 0) || 0

      return {
        ...ingredient,
        available,
        hasEnough: available >= ingredient.needed
      }
    })
  )

  const canProduce = ingredientsWithStock.every(i => i.hasEnough)

  const statusColors: Record<string, string> = {
    programada: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    en_proceso: 'bg-blue-100 text-blue-700 border-blue-200',
    completada: 'bg-green-100 text-green-700 border-green-200',
    cancelada: 'bg-red-100 text-red-700 border-red-200',
  }

  const statusLabels: Record<string, string> = {
    programada: 'Programada',
    en_proceso: 'En Proceso',
    completada: 'Completada',
    cancelada: 'Cancelada',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/produccion/ordenes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Orden {order.order_number}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>
          <p className="text-muted-foreground">
            Creada el {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      {/* Información de la Orden */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Información de la Orden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-600">Producto</label>
              <p className="text-lg font-semibold">{order.product.name}</p>
              <p className="text-sm text-slate-500">{order.product.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Cantidad Planificada</label>
              <p className="text-lg font-semibold text-purple-600">
                {order.quantity_planned} {order.product.unit?.symbol}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Fecha Programada</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <p className="text-lg font-semibold">{formatDate(order.scheduled_date)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredientes Necesarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Ingredientes Necesarios
          </CardTitle>
          <CardDescription>
            Insumos requeridos para producir {order.quantity_planned} {order.product.unit?.symbol}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Insumo</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Necesario</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Disponible</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ingredientsWithStock.map((ingredient) => (
                  <tr key={ingredient.id}>
                    <td className="py-3 px-4">
                      <div className="font-medium">{ingredient.supply.name}</div>
                      <div className="text-xs text-slate-500">{ingredient.supply.code}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-purple-600">
                        {ingredient.needed.toFixed(3)} {ingredient.unit.symbol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${
                        ingredient.hasEnough ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {ingredient.available.toFixed(3)} {ingredient.unit.symbol}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {ingredient.hasEnough ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          ✓ Suficiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          ✗ Insuficiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Registro de Producción */}
      {order.status === 'programada' && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Producción</CardTitle>
            <CardDescription>
              Ejecuta la producción y consume los insumos automáticamente (FIFO)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterProductionForm 
              order={order} 
              ingredients={ingredientsWithStock}
              canProduce={canProduce}
            />
          </CardContent>
        </Card>
      )}

      {order.status === 'completada' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-center text-green-700 font-medium">
              ✅ Esta orden ya fue completada
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
