import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupplierEditForm } from '@/components/forms/supplier-edit-form'
import { SupplierCatalogManager } from '@/components/forms/supplier-catalog-manager'
import { ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default async function EditSupplierPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: supplier },
    { data: catalog },
    { data: supplies },
  ] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', id).single(),
    supabase
      .from('supplier_supply_catalog')
      .select('*, supply:supplies(id, name, unit:units(id, name, symbol))')
      .eq('supplier_id', id)
      .eq('is_active', true)
      .order('created_at'),
    supabase
      .from('supplies')
      .select('id, name, unit_id, unit:units(id, name, symbol)')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!supplier) notFound()

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Compras', href: '/compras' },
        { label: 'Proveedores', href: '/compras/proveedores' },
        { label: supplier.business_name },
      ]} />
      <div className="flex items-center gap-4">
        <Link href="/compras/proveedores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Proveedor</h1>
          <p className="text-muted-foreground">Modifica la información del proveedor</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{supplier.business_name}</CardTitle>
          <CardDescription>RUC: {supplier.ruc || 'N/A'}</CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierEditForm supplier={supplier as Parameters<typeof SupplierEditForm>[0]['supplier']} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Empaques de compra
          </CardTitle>
          <CardDescription>
            Define cómo vende este proveedor cada insumo. La OC mostrará "2 Cajas × 12 L" y el
            inventario recibirá 24 L.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierCatalogManager
            supplierId={id}
            catalog={(catalog ?? []) as Parameters<typeof SupplierCatalogManager>[0]['catalog']}
            supplies={(supplies ?? []) as Parameters<typeof SupplierCatalogManager>[0]['supplies']}
          />
        </CardContent>
      </Card>
    </div>
  )
}
