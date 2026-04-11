import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ProductsTable } from '@/components/tables/products-table'

export default async function ProductsPage() {
  const supabase = await createClient()
  
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, type),
      unit:units(id, name, symbol)
    `)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching products:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona los productos terminados que produces
          </p>
        </div>
        <Link href="/produccion/productos/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            {products?.length || 0} productos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductsTable products={products || []} />
        </CardContent>
      </Card>
    </div>
  )
}
