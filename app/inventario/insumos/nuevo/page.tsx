import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupplyForm } from '@/components/forms/supply-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function NewSupplyPage() {
  const supabase = await createClient()
  
  // Obtener categorías de tipo 'insumo'
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('type', 'insumo')
    .order('name', { ascending: true })

  // Obtener unidades
  const { data: units } = await supabase
    .from('units')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventario/insumos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Insumo</h1>
          <p className="text-muted-foreground">
            Registra un nuevo insumo en el inventario
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Insumo</CardTitle>
          <CardDescription>
            Completa los datos del insumo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplyForm categories={categories || []} units={units || []} />
        </CardContent>
      </Card>
    </div>
  )
}
