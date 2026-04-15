import { createClient } from '@/utils/supabase/server'
import { KardexColumns } from '@/components/tables/kardex-table'
import { MonthSelector } from '@/components/ui/month-selector'

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1

  if (mes) {
    const [y, m] = mes.split('-').map(Number)
    if (y && m) { year = y; month = m }
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const mesLabel = new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
    }
  })

  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*, unit:units(id, name, symbol)')
    .gte('movement_date', monthStart)
    .lt('movement_date', nextMonth)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })

  const all = movements || []

  // Batch-fetch entity names
  const supplyIds  = [...new Set(all.filter(m => m.entity_type === 'insumo').map(m => m.entity_id))]
  const productIds = [...new Set(all.filter(m => m.entity_type === 'producto').map(m => m.entity_id))]

  const [{ data: supplies }, { data: products }] = await Promise.all([
    supplyIds.length > 0
      ? supabase.from('supplies').select('id, name, code').in('id', supplyIds)
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase.from('products').select('id, name, code').in('id', productIds)
      : Promise.resolve({ data: [] }),
  ])

  const supplyMap  = Object.fromEntries((supplies  || []).map(s => [s.id, `${s.name} (${s.code})`]))
  const productMap = Object.fromEntries((products  || []).map(p => [p.id, `${p.name} (${p.code})`]))

  const enhanced = all.map(m => ({
    ...m,
    entity_name: m.entity_type === 'insumo'
      ? (supplyMap[m.entity_id]  ?? 'Desconocido')
      : (productMap[m.entity_id] ?? 'Desconocido'),
  }))

  const insumos   = enhanced.filter(m => m.entity_type === 'insumo'   && m.movement_type !== 'ajuste')
  const productos = enhanced.filter(m => m.entity_type === 'producto' && m.movement_type !== 'ajuste')
  const ajustes   = enhanced.filter(m => m.movement_type === 'ajuste' || m.movement_reason === 'ajuste_inventario')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kardex de Inventario</h1>
          <p className="text-muted-foreground capitalize">
            {all.length} movimientos — {mesLabel}
          </p>
        </div>
        <MonthSelector options={monthOptions} current={mes || monthOptions[0].value} />
      </div>

      <KardexColumns insumos={insumos} productos={productos} ajustes={ajustes} />
    </div>
  )
}
