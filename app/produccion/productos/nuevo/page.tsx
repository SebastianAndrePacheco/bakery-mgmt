import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductForm } from '@/components/forms/product-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default async function NewProductPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: units }, { data: lastProduct }] = await Promise.all([
    supabase.from('categories').select('*').eq('type', 'producto').order('name'),
    supabase.from('units').select('*').order('name'),
    supabase.from('products').select('code').like('code', 'PRD-%').order('code', { ascending: false }).limit(1),
  ])

  const lastNum = lastProduct?.[0]?.code ? parseInt(lastProduct[0].code.replace('PRD-', '') || '0') : 0
  const nextCode = `PRD-${String(lastNum + 1).padStart(3, '0')}`

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Producción', href: '/produccion' },
        { label: 'Productos', href: '/produccion/productos' },
        { label: 'Nuevo Producto' },
      ]} />
      <div className="flex items-center gap-4">
        <Link href="/produccion/productos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Producto</h1>
          <p className="text-muted-foreground">
            Registra un nuevo producto terminado
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Producto</CardTitle>
          <CardDescription>
            Completa los datos del producto que produces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm categories={categories || []} units={units || []} nextCode={nextCode} />
        </CardContent>
      </Card>
    </div>
  )
}
