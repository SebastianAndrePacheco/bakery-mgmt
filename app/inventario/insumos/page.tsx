import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { SuppliesTable } from '@/components/tables/supplies-table'
import { Suspense } from 'react'

const PAGE_SIZE = 20

export default async function SuppliesPage({
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
    .from('supplies')
    .select(`
      *,
      category:categories(id, name, type),
      unit:units(id, name, symbol)
    `, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to)

  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`)

  const { data: supplies, count, error } = await query

  if (error) {
    console.error('Error fetching supplies:', error)
  }

  // Obtener stock de todos los insumos de la página en una sola consulta (evita N+1)
  const supplyIds = (supplies || []).map(s => s.id)
  const { data: batchTotals } = supplyIds.length > 0
    ? await supabase
        .from('supply_batches')
        .select('supply_id, current_quantity')
        .in('supply_id', supplyIds)
        .eq('status', 'disponible')
    : { data: [] }

  const stockMap = (batchTotals || []).reduce<Record<string, number>>((acc, b) => {
    acc[b.supply_id] = (acc[b.supply_id] || 0) + b.current_quantity
    return acc
  }, {})

  const suppliesWithStock = (supplies || []).map(s => ({
    ...s,
    current_stock: stockMap[s.id] || 0,
  }))

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Insumos</h1>
          <p className="text-muted-foreground">
            Gestiona el inventario de insumos
          </p>
        </div>
        <Link href="/inventario/insumos/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Insumo
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Insumos</CardTitle>
              <CardDescription>{count || 0} insumos{q ? ` para "${q}"` : ' registrados'}</CardDescription>
            </div>
            <div className="w-64">
              <Suspense>
                <SearchInput placeholder="Buscar por nombre o código..." />
              </Suspense>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SuppliesTable supplies={suppliesWithStock} />
          <Pagination page={page} totalPages={totalPages} basePath="/inventario/insumos" />
        </CardContent>
      </Card>
    </div>
  )
}
