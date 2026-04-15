import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AdjustmentForm } from '@/components/forms/adjustment-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default async function NewAdjustmentPage() {
  const supabase = await createClient()

  // Obtener insumos
  const { data: supplies } = await supabase
    .from('supplies')
    .select('*, unit:units(symbol), category:categories(name)')
    .eq('is_active', true)
    .order('name')

  // Obtener productos
  const { data: products } = await supabase
    .from('products')
    .select('*, unit:units(symbol)')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Inventario', href: '/inventario' },
        { label: 'Ajustes', href: '/inventario/ajustes' },
        { label: 'Nuevo Ajuste' },
      ]} />
      <div className="flex items-center gap-4">
        <Link href="/inventario/ajustes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Ajuste de Inventario</h1>
          <p className="text-muted-foreground">
            Registra correcciones manuales de stock
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Ajuste</CardTitle>
          <CardDescription>
            Los ajustes se registrarán en el kardex como movimientos de ajuste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdjustmentForm supplies={supplies || []} products={products || []} />
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-amber-900 mb-2">⚠️ Tipos de Ajustes Comunes:</h3>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li><strong>Merma:</strong> Pérdida de producto por deterioro, vencimiento, o desperdicio</li>
            <li><strong>Corrección:</strong> Diferencia entre inventario físico y sistema</li>
            <li><strong>Robo/Pérdida:</strong> Faltante por causas externas</li>
            <li><strong>Ajuste positivo:</strong> Encontrar stock no registrado</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
