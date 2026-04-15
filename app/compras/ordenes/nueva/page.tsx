import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PurchaseOrderForm } from '@/components/forms/purchase-order-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient()
  
  // Obtener proveedores activos
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('business_name', { ascending: true })

  // Obtener insumos activos
  const { data: supplies } = await supabase
    .from('supplies')
    .select(`
      *,
      unit:units(id, name, symbol)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Compras', href: '/compras' },
        { label: 'Órdenes de Compra', href: '/compras/ordenes' },
        { label: 'Nueva Orden' },
      ]} />
      <div className="flex items-center gap-4">
        <Link href="/compras/ordenes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nueva Orden de Compra</h1>
          <p className="text-muted-foreground">
            Crea una nueva orden de compra a un proveedor
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Orden</CardTitle>
          <CardDescription>
            Completa los datos de la orden de compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseOrderForm 
            suppliers={suppliers || []} 
            supplies={supplies || []} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
