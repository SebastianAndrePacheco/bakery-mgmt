import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { AdjustmentsTable } from '@/components/tables/adjustments-table'
import { Suspense } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'

const PAGE_SIZE = 30

const REASONS = [
  { value: '', label: 'Todos los motivos' },
  { value: 'merma', label: 'Merma / Deterioro' },
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'correccion', label: 'Corrección' },
  { value: 'ajuste_inventario', label: 'Ajuste Inventario' },
  { value: 'robo', label: 'Robo / Pérdida' },
  { value: 'otro', label: 'Otro' },
]

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; razon?: string }>
}) {
  const { page: pageParam, q, razon } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  let query = supabase
    .from('inventory_movements')
    .select('*', { count: 'exact' })
    .not('movement_reason', 'in', '(compra,produccion,devolucion_proveedor,venta_manual)')
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (razon) query = query.eq('movement_reason', razon)
  if (q) query = query.ilike('notes', `%${q}%`)

  const { data: movements, count } = await query

  // Obtener supplies y products para enriquecer
  const { data: supplies } = await supabase
    .from('supplies')
    .select('id, code, name, unit:units(symbol)')

  const { data: products } = await supabase
    .from('products')
    .select('id, code, name, unit:units(symbol)')

  type EntityRef = { id: string; code: string; name: string; unit: unknown }
  const suppliesMap: Record<string, EntityRef> = Object.fromEntries(
    (supplies ?? []).map((s) => [s.id, s as unknown as EntityRef])
  )
  const productsMap: Record<string, EntityRef> = Object.fromEntries(
    (products ?? []).map((p) => [p.id, p as unknown as EntityRef])
  )

  const adjustments = movements?.map(m => ({
    ...m,
    supply: m.entity_type === 'insumo' ? suppliesMap[m.entity_id] : undefined,
    product: m.entity_type === 'producto' ? productsMap[m.entity_id] : undefined,
  })) || []

  const totalAdjustments = count || 0
  const positiveAdjustments = adjustments.filter(a => a.movement_type === 'entrada').length
  const negativeAdjustments = adjustments.filter(a => a.movement_type === 'salida').length
  const totalPages = Math.ceil(totalAdjustments / PAGE_SIZE)

  const selectedRazonLabel = REASONS.find(r => r.value === (razon || ''))?.label || 'Todos'

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

      {/* Métricas de la página actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Registros</CardDescription>
            <CardTitle className="text-3xl text-slate-700">{totalAdjustments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Positivos (página)</CardDescription>
            <CardTitle className="text-3xl text-green-600">+{positiveAdjustments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Negativos (página)</CardDescription>
            <CardTitle className="text-3xl text-red-600">-{negativeAdjustments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de ajustes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Historial de Ajustes
              </CardTitle>
              <CardDescription>
                {totalAdjustments} registros{razon ? ` — ${selectedRazonLabel}` : ''}{q ? ` — notas: "${q}"` : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Suspense>
                <FilterSelect
                  paramName="razon"
                  options={REASONS.slice(1).map(r => ({ value: r.value, label: r.label }))}
                  placeholder="Todos los motivos"
                />
              </Suspense>
              <div className="w-52">
                <Suspense>
                  <SearchInput placeholder="Buscar en observaciones..." paramName="q" />
                </Suspense>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdjustmentsTable adjustments={adjustments} />
          <Pagination page={page} totalPages={totalPages} basePath="/inventario/ajustes" />
        </CardContent>
      </Card>
    </div>
  )
}
