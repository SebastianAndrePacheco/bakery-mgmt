import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { SuppliersTable } from '@/components/tables/suppliers-table'
import { Suspense } from 'react'

const PAGE_SIZE = 20

export default async function SuppliersPage({
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
    .from('suppliers')
    .select('*', { count: 'exact' })
    .order('business_name', { ascending: true })
    .range(from, to)

  if (q) query = query.or(`business_name.ilike.%${q}%,contact_name.ilike.%${q}%,ruc.ilike.%${q}%`)

  const { data: suppliers, count, error } = await query

  if (error) {
    console.error('Error fetching suppliers:', error)
  }

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestiona los proveedores de insumos
          </p>
        </div>
        <Link href="/compras/proveedores/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proveedor
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Proveedores</CardTitle>
              <CardDescription>{count || 0} proveedores{q ? ` para "${q}"` : ' registrados'}</CardDescription>
            </div>
            <div className="w-64">
              <Suspense>
                <SearchInput placeholder="Nombre, contacto o RUC..." />
              </Suspense>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SuppliersTable suppliers={suppliers || []} />
          <Pagination page={page} totalPages={totalPages} basePath="/compras/proveedores" />
        </CardContent>
      </Card>
    </div>
  )
}
