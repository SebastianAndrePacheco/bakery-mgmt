import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { SuppliersTable } from '@/components/tables/suppliers-table'

export default async function SuppliersPage() {
  const supabase = await createClient()
  
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('business_name', { ascending: true })

  if (error) {
    console.error('Error fetching suppliers:', error)
  }

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
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            {suppliers?.length || 0} proveedores registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuppliersTable suppliers={suppliers || []} />
        </CardContent>
      </Card>
    </div>
  )
}
