import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BatchesTable } from '@/components/tables/batches-table'

export default async function SupplyBatchesPage({ 
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

  // Obtener los lotes ordenados por FIFO (fecha vencimiento, luego fecha recepción)
  const { data: batches } = await supabase
    .from('supply_batches')
    .select(`
      *,
      supplier:suppliers(id, business_name)
    `)
    .eq('supply_id', id)
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .order('received_date', { ascending: true })

  const totalStock = batches?.reduce(
    (sum, batch) => sum + (batch.current_quantity || 0),
    0
  ) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventario/insumos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Lotes de {supply.name}</h1>
          <p className="text-muted-foreground">
            Código: {supply.code} | Stock Total: {totalStock.toFixed(2)} {supply.unit?.symbol}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Lotes Disponibles (FIFO)
          </CardTitle>
          <CardDescription>
            {batches?.length || 0} lotes registrados | Ordenados por fecha de vencimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BatchesTable batches={batches || []} unit={supply.unit} />
        </CardContent>
      </Card>
    </div>
  )
}
