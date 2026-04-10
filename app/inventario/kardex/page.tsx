import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KardexTable } from '@/components/tables/kardex-table'

export default async function KardexPage() {
  const supabase = await createClient()
  
  const { data: movements, error } = await supabase
    .from('inventory_movements')
    .select(`
      *,
      unit:units(id, name, symbol)
    `)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching movements:', error)
  }

  // Obtener nombres de insumos/productos
  const enhancedMovements = await Promise.all(
    (movements || []).map(async (movement) => {
      let entityName = 'Desconocido'
      
      if (movement.entity_type === 'insumo') {
        const { data: supply } = await supabase
          .from('supplies')
          .select('name, code')
          .eq('id', movement.entity_id)
          .single()
        
        if (supply) {
          entityName = `${supply.name} (${supply.code})`
        }
      } else if (movement.entity_type === 'producto') {
        const { data: product } = await supabase
          .from('products')
          .select('name, code')
          .eq('id', movement.entity_id)
          .single()
        
        if (product) {
          entityName = `${product.name} (${product.code})`
        }
      }
      
      return {
        ...movement,
        entity_name: entityName
      }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kardex de Inventario</h1>
        <p className="text-muted-foreground">
          Registro de todos los movimientos de inventario
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Inventario</CardTitle>
          <CardDescription>
            Últimos {enhancedMovements?.length || 0} movimientos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KardexTable movements={enhancedMovements || []} />
        </CardContent>
      </Card>
    </div>
  )
}
