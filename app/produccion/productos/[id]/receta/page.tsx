import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChefHat } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RecipeForm } from '@/components/forms/recipe-form'
import { RecipeTable } from '@/components/tables/recipe-table'

export default async function ProductRecipePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()

  // Obtener el producto
  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(name), unit:units(name, symbol)')
    .eq('id', id)
    .single()

  if (!product) {
    notFound()
  }

  // Obtener la receta actual (ingredientes)
  const { data: recipeItems } = await supabase
    .from('product_recipes')
    .select(`
      *,
      supply:supplies(id, code, name, unit:units(id, name, symbol)),
      unit:units(id, name, symbol)
    `)
    .eq('product_id', id)
    .order('created_at', { ascending: true })

  // Obtener todos los insumos activos para el formulario
  const { data: supplies } = await supabase
    .from('supplies')
    .select('*, unit:units(id, name, symbol)')
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Obtener unidades
  const { data: units } = await supabase
    .from('units')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/produccion/productos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ChefHat className="w-8 h-8" />
            Receta: {product.name}
          </h1>
          <p className="text-muted-foreground">
            Código: {product.code} | Categoría: {product.category?.name}
          </p>
        </div>
      </div>

      {/* Receta actual */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredientes de la Receta</CardTitle>
          <CardDescription>
            {recipeItems?.length || 0} ingredientes configurados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecipeTable 
            recipeItems={recipeItems || []} 
            productId={id}
            productUnit={product.unit}
          />
        </CardContent>
      </Card>

      {/* Agregar ingrediente */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Ingrediente</CardTitle>
          <CardDescription>
            Define los insumos necesarios para producir 1 {product.unit?.symbol} de {product.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecipeForm 
            productId={id}
            supplies={supplies || []}
            units={units || []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
