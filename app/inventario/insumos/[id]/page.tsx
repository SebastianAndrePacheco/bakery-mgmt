import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupplyEditForm } from '@/components/forms/supply-edit-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'

export default async function EditSupplyPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createClient()
  
  // Obtener el insumo
  const { data: supply } = await supabase
    .from('supplies')
    .select(`
      *,
      category:categories(id, name),
      unit:units(id, name, symbol)
    `)
    .eq('id', id)
    .single()

  if (!supply) {
    notFound()
  }

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
          <h1 className="text-3xl font-bold">Editar Insumo</h1>
          <p className="text-muted-foreground">
            Modifica la información del insumo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{supply.name}</CardTitle>
          <CardDescription>
            Código: {supply.code}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplyEditForm 
            supply={supply} 
            categories={categories || []} 
            units={units || []} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
