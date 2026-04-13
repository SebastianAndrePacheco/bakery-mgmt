import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { AdjustmentsTable } from '@/components/tables/adjustments-table'

export default async function AdjustmentsPage() {
  const supabase = await createClient()

  // Obtener movimientos de ajuste (merma, vencimiento, ajuste_inventario)
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*')
    .not('movement_reason', 'in', '(compra,produccion,devolucion_proveedor,venta_manual)')
    .order('movement_date', { ascending: false })
    .limit(50)

  // Obtener supplies y products
  const { data: supplies } = await supabase
    .from('supplies')
    .select('id, code, name, unit:units(symbol)')

  const { data: products } = await supabase
    .from('products')
    .select('id, code, name, unit:units(symbol)')

  // Crear maps
  const suppliesMap = supplies?.reduce((acc: any, s: any) => {
    acc[s.id] = s
    return acc
  }, {}) || {}

  const productsMap = products?.reduce((acc: any, p: any) => {
    acc[p.id] = p
    return acc
  }, {}) || {}

  // Combinar manualmente
  const adjustments = movements?.map(m => ({
    ...m,
    supply: m.entity_type === 'insumo' ? suppliesMap[m.entity_id] : undefined,
    product: m.entity_type === 'producto' ? productsMap[m.entity_id] : undefined,
  })) || []

  const totalAdjustments = adjustments.length
  const positiveAdjustments = adjustments.filter(a => a.movement_type === 'entrada').length
  const negativeAdjustments = adjustments.filter(a => a.movement_type === 'salida').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ajustes de Inventario</h1>
          <p className="text-muted-foreground">
            Correcciones manuales de stock
          </p>
        </div>
        <Link href="/inventario/ajustes/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Ajuste
          </Button>
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Ajustes</CardDescription>
            <CardTitle className="text-3xl text-slate-700">
              {totalAdjustments}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ajustes Positivos</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              +{positiveAdjustments}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ajustes Negativos</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              -{negativeAdjustments}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de ajustes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Historial de Ajustes
          </CardTitle>
          <CardDescription>
            Últimos {totalAdjustments} ajustes registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdjustmentsTable adjustments={adjustments} />
        </CardContent>
      </Card>
    </div>
  )
}
