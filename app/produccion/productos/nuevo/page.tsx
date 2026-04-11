import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductForm } from '@/components/forms/product-form'

export default async function NewProductPage() {
  const supabase = await createClient()

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
          <h1 className="text-3xl font-bold">Nuevo Producto</h1>
          <p className="text-muted-foreground">
            Registra un nuevo producto terminado
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Producto</CardTitle>
          <CardDescription>
            Completa los datos del producto que produces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm categories={categories || []} units={units || []} />
        </CardContent>
      </Card>
    </div>
  )
}
