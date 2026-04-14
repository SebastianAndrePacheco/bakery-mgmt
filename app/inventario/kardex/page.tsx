import { createClient } from '@/utils/supabase/server'
import { KardexColumns } from '@/components/tables/kardex-table'

export default async function KardexPage() {
  const supabase = await createClient()

  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*, unit:units(id, name, symbol)')
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  const all = movements || []

  // Batch-fetch entity names (un solo query por tipo)
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

  const entradas       = enhanced.filter(m => m.movement_type === 'entrada')
  const salidasInsumo  = enhanced.filter(m => m.movement_type === 'salida' && m.entity_type === 'insumo')
  const salidasProduct = enhanced.filter(m => m.movement_type === 'salida' && m.entity_type === 'producto')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kardex de Inventario</h1>
        <p className="text-muted-foreground">Registro de movimientos por tipo — últimos {all.length}</p>
      </div>

      <KardexColumns
        entradas={entradas}
        salidasInsumo={salidasInsumo}
        salidasProducto={salidasProduct}
      />
    </div>
  )
}
