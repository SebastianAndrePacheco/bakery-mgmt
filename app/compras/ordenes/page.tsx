import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PurchaseOrdersTable } from '@/components/tables/purchase-orders-table'

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()
  
  const { data: orders, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, business_name, contact_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching purchase orders:', error)
  }

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
            {orders?.length || 0} órdenes registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseOrdersTable orders={orders || []} />
        </CardContent>
      </Card>
    </div>
  )
}
