import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PurchaseOrdersTable } from '@/components/tables/purchase-orders-table'

const PAGE_SIZE = 20

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const { data: orders, count, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, business_name, contact_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

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
          <CardTitle>Lista de Órdenes de Compra</CardTitle>
          <CardDescription>
            {count || 0} órdenes registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseOrdersTable orders={orders || []} />
          <Pagination page={page} totalPages={totalPages} basePath="/compras/ordenes" />
        </CardContent>
      </Card>
    </div>
  )
}
