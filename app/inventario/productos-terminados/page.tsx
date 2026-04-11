import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag } from 'lucide-react'
import { ProductBatchesTable } from '@/components/tables/product-batches-table'

export default async function FinishedProductsPage() {
  const supabase = await createClient()
  
  // Obtener todos los lotes de productos
  const { data: batches } = await supabase
    .from('production_batches')
    .select(`
      *,
      product:products(
        id,
        code,
        name,
        unit:units(symbol)
      )
    `)
    .order('production_date', { ascending: false })

  // Calcular totales
  const totalBatches = batches?.length || 0
  const totalQuantity = batches?.reduce((sum, b) => sum + (b.current_quantity || 0), 0) || 0
  const totalValue = batches?.reduce((sum, b) => sum + (b.total_cost || 0), 0) || 0
  const availableBatches = batches?.filter(b => b.status === 'disponible').length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Productos Terminados</h1>
        <p className="text-muted-foreground">
          Inventario de productos producidos
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lotes Totales</CardDescription>
            <CardTitle className="text-3xl">{totalBatches}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lotes Disponibles</CardDescription>
            <CardTitle className="text-3xl text-green-600">{availableBatches}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cantidad Total</CardDescription>
            <CardTitle className="text-3xl">{totalQuantity.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Valor Inventario</CardDescription>
            <CardTitle className="text-3xl text-purple-600">S/ {totalValue.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Lotes de Productos
          </CardTitle>
          <CardDescription>
            {batches?.length || 0} lotes registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductBatchesTable batches={batches || []} />
        </CardContent>
      </Card>
    </div>
  )
}
