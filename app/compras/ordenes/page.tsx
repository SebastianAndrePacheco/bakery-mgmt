import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PurchaseOrdersTable } from '@/components/tables/purchase-orders-table'
import { Suspense } from 'react'

const PAGE_SIZE = 20

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageParam, q } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  // Si hay búsqueda por proveedor, obtener IDs coincidentes primero
  let supplierIds: string[] | null = null
  if (q) {
    const { data: matched } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('business_name', `%${q}%`)
    supplierIds = matched?.map(s => s.id) ?? []
  }

  let query = supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, business_name, contact_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    if (supplierIds && supplierIds.length > 0) {
      query = query.or(`order_number.ilike.%${q}%,supplier_id.in.(${supplierIds.join(',')})`)
    } else {
      query = query.ilike('order_number', `%${q}%`)
    }
  }

  const { data: orders, count, error } = await query

  if (error) {
    console.error('Error fetching purchase orders:', error)
  }

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
          <p className="text-muted-foreground">
            Gestiona las órdenes de compra a proveedores
          </p>
        </div>
        <Link href="/compras/ordenes/nueva">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Órdenes de Compra</CardTitle>
              <CardDescription>{count || 0} órdenes{q ? ` para "${q}"` : ''}</CardDescription>
            </div>
            <div className="w-64">
              <Suspense>
                <SearchInput placeholder="N° orden o proveedor..." />
              </Suspense>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PurchaseOrdersTable orders={orders || []} />
          <Pagination page={page} totalPages={totalPages} basePath="/compras/ordenes" />
        </CardContent>
      </Card>
    </div>
  )
}
