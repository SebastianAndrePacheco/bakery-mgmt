import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ProductionOrdersTable } from '@/components/tables/production-orders-table'

export default async function ProductionOrdersPage() {
  const supabase = await createClient()
  
  const { data: orders, error } = await supabase
    .from('production_orders')
    .select(`
      *,
      product:products(id, code, name, unit:units(symbol))
    `)
    .order('production_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching production orders:', error)
  }

  // Contar por estado
  const pending = orders?.filter(o => o.status === 'programada').length || 0
  const inProgress = orders?.filter(o => o.status === 'en_proceso').length || 0
  const completed = orders?.filter(o => o.status === 'completada').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de Producción</h1>
          <p className="text-muted-foreground">
            Programa y gestiona la producción diaria
          </p>
        </div>
        <Link href="/produccion/ordenes/nueva">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </Button>
        </Link>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Programadas</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>En Proceso</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Órdenes</CardTitle>
          <CardDescription>
            {orders?.length || 0} órdenes registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductionOrdersTable orders={orders || []} />
        </CardContent>
      </Card>
    </div>
  )
}
