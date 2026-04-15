import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { ShoppingBag } from 'lucide-react'
import { ProductBatchesTable } from '@/components/tables/product-batches-table'
import { Suspense } from 'react'
import { FilterSelect } from '@/components/ui/filter-select'

const PAGE_SIZE = 30

export default async function FinishedProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; estado?: string }>
}) {
  const { page: pageParam, q, estado } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  // Si hay búsqueda por nombre de producto, obtener IDs primero
  let productIds: string[] | null = null
  if (q) {
    const { data: matched } = await supabase
      .from('products')
      .select('id')
      .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
    productIds = matched?.map(p => p.id) ?? []
  }

  let query = supabase
    .from('production_batches')
    .select(`
      *,
      product:products(id, code, name, unit:units(symbol))
    `, { count: 'exact' })
    .order('production_date', { ascending: false })
    .range(from, to)

  if (estado) query = query.eq('status', estado)
  if (q) {
    if (productIds && productIds.length > 0) {
      query = query.or(`batch_code.ilike.%${q}%,product_id.in.(${productIds.join(',')})`)
    } else if (productIds && productIds.length === 0) {
      query = query.ilike('batch_code', `%${q}%`)
    }
  }

  const { data: batches, count } = await query

  const totalBatches = count || 0
  const availableBatches = batches?.filter(b => b.status === 'disponible').length || 0
  const totalQuantity = batches?.reduce((sum, b) => sum + (b.current_quantity || 0), 0) || 0
  const totalValue = batches?.reduce((sum, b) => sum + (b.total_cost || 0), 0) || 0
  const totalPages = Math.ceil(totalBatches / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Productos Terminados</h1>
        <p className="text-muted-foreground">
          Inventario de productos producidos
        </p>
      </div>

      {/* Métricas de página actual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lotes Totales</CardDescription>
            <CardTitle className="text-3xl">{totalBatches}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Disponibles (página)</CardDescription>
            <CardTitle className="text-3xl text-green-600">{availableBatches}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cantidad (página)</CardDescription>
            <CardTitle className="text-3xl">{totalQuantity.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Valor (página)</CardDescription>
            <CardTitle className="text-3xl text-purple-600">S/ {totalValue.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Lotes de Productos
              </CardTitle>
              <CardDescription>
                {totalBatches} lotes{q ? ` para "${q}"` : ''}{estado ? ` — ${estado}` : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Suspense>
                <FilterSelect
                  paramName="estado"
                  options={[
                    { value: 'disponible', label: 'Disponible' },
                    { value: 'agotado', label: 'Agotado' },
                    { value: 'vencido', label: 'Vencido' },
                  ]}
                  placeholder="Todos los estados"
                />
              </Suspense>
              <div className="w-56">
                <Suspense>
                  <SearchInput placeholder="Producto o N° lote..." />
                </Suspense>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProductBatchesTable batches={batches || []} />
          <Pagination page={page} totalPages={totalPages} basePath="/inventario/productos-terminados" />
        </CardContent>
      </Card>
    </div>
  )
}
