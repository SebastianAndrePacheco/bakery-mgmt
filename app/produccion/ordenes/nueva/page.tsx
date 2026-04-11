import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductionOrderForm } from '@/components/forms/production-order-form'

export default async function NewProductionOrderPage() {
  const supabase = await createClient()

  // Obtener productos activos que tengan receta
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      unit:units(id, name, symbol),
      recipes:product_recipes(count)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Filtrar solo productos con receta
  const productsWithRecipe = products?.filter(p => p.recipes && p.recipes.length > 0) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/produccion/ordenes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nueva Orden de Producción</h1>
          <p className="text-muted-foreground">
            Programa la producción de productos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Orden</CardTitle>
          <CardDescription>
            Completa los datos para crear la orden de producción
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductionOrderForm products={productsWithRecipe} />
        </CardContent>
      </Card>
    </div>
  )
}
