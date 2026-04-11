import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductEditForm } from '@/components/forms/product-edit-form'

export default async function EditProductPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()

  // Obtener el producto
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) {
    notFound()
  }

  // Obtener categorías de tipo 'producto'
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('type', 'producto')
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
        <div>
          <h1 className="text-3xl font-bold">Editar Producto</h1>
          <p className="text-muted-foreground">
            Código: {product.code} | {product.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Producto</CardTitle>
          <CardDescription>
            Modifica los datos del producto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductEditForm 
            product={product} 
            categories={categories || []} 
            units={units || []} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
