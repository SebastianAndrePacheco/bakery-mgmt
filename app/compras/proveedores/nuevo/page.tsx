import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupplierForm } from '@/components/forms/supplier-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/compras/proveedores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Proveedor</h1>
          <p className="text-muted-foreground">
            Registra un nuevo proveedor en el sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Proveedor</CardTitle>
          <CardDescription>
            Completa los datos del proveedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierForm />
        </CardContent>
      </Card>
    </div>
  )
}
