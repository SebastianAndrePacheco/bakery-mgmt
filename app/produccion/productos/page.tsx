import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ProductsTable } from '@/components/tables/products-table'
import { Suspense } from 'react'

const PAGE_SIZE = 20

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageParam, q } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, type),
      unit:units(id, name, symbol)
    `, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to)

  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`)

  const { data: products, count, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
  }

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Productos</CardTitle>
              <CardDescription>{count || 0} productos{q ? ` para "${q}"` : ' registrados'}</CardDescription>
            </div>
            <div className="w-64">
              <Suspense>
                <SearchInput placeholder="Nombre o código..." />
              </Suspense>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProductsTable products={products || []} />
          <Pagination page={page} totalPages={totalPages} basePath="/produccion/productos" />
        </CardContent>
      </Card>
    </div>
  )
}
