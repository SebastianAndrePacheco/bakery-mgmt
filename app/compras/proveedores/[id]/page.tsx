import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupplierEditForm } from '@/components/forms/supplier-edit-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'

export default async function EditSupplierPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()

  if (!supplier) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/compras/proveedores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Proveedor</h1>
          <p className="text-muted-foreground">
            Modifica la información del proveedor
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{supplier.business_name}</CardTitle>
          <CardDescription>
            RUC: {supplier.ruc || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierEditForm supplier={supplier} />
        </CardContent>
      </Card>
    </div>
  )
}
