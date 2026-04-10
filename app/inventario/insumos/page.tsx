import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { SuppliesTable } from '@/components/tables/supplies-table'

export default async function SuppliesPage() {
  const supabase = await createClient()
  
  const { data: supplies, error } = await supabase
    .from('supplies')
    .select(`
      *,
      category:categories(id, name, type),
      unit:units(id, name, symbol)
    `)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching supplies:', error)
  }

  // Obtener stock actual de cada insumo sumando los lotes disponibles
  const suppliesWithStock = await Promise.all(
    (supplies || []).map(async (supply) => {
      const { data: batches } = await supabase
        .from('supply_batches')
        .select('current_quantity')
        .eq('supply_id', supply.id)
        .eq('status', 'disponible')

      const currentStock = batches?.reduce(
        (sum, batch) => sum + (batch.current_quantity || 0), 
        0
      ) || 0

      return {
        ...supply,
        current_stock: currentStock
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Insumos</h1>
          <p className="text-muted-foreground">
            Gestiona el inventario de insumos
          </p>
        </div>
        <Link href="/inventario/insumos/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Insumo
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Insumos</CardTitle>
          <CardDescription>
            {supplies?.length || 0} insumos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuppliesTable supplies={suppliesWithStock || []} />
        </CardContent>
      </Card>
    </div>
  )
}
