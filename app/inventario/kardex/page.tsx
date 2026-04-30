import { createClient } from '@/utils/supabase/server'
import { MonthSelector } from '@/components/ui/month-selector'
import { KardexSummary, KardexDetail } from '@/components/tables/kardex-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; entity_id?: string; entity_type?: string }>
}) {
  const { mes, entity_id, entity_type } = await searchParams
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
  const mesParam = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
    }
  })

  // ── Queries base ───────────────────────────────────────────────────────────

  const [
    { data: movements },
    { data: supplies },
    { data: products },
    { data: supplyBatches },
    { data: productBatches },
  ] = await Promise.all([
    supabase
      .from('inventory_movements')
      .select('id, movement_type, movement_reason, entity_type, entity_id, quantity, unit_id, unit_cost, total_cost, notes, movement_date, created_at, unit:units(id, symbol)')
      .gte('movement_date', entity_id ? '1900-01-01' : monthStart)
      .lt('movement_date', entity_id ? nextMonth : nextMonth)
      .order('movement_date', { ascending: entity_id ? true : false })
      .order('created_at', { ascending: entity_id ? true : false }),
    supabase
      .from('supplies')
      .select('id, name, code, unit:units(id, symbol)')
      .eq('is_active', true),
    supabase
      .from('products')
      .select('id, name, code, unit:units(id, symbol)')
      .eq('is_active', true),
    supabase
      .from('supply_batches')
      .select('supply_id, current_quantity, unit_price')
      .eq('status', 'disponible'),
    supabase
      .from('production_batches')
      .select('product_id, current_quantity, unit_cost, total_cost, quantity_produced')
      .eq('status', 'disponible'),
  ])

  type UnitRef = { id: string; symbol: string }
  type SupplyRow = { id: string; name: string; code: string; unit: UnitRef | null }
  type ProductRow = { id: string; name: string; code: string; unit: UnitRef | null }

  const supplyMap = new Map<string, SupplyRow>()
  for (const s of (supplies as SupplyRow[] | null) ?? []) supplyMap.set(s.id, s)

  const productMap = new Map<string, ProductRow>()
  for (const p of (products as ProductRow[] | null) ?? []) productMap.set(p.id, p)

  // Stock actual por supply_id
  const supplyStock = new Map<string, { qty: number; value: number }>()
  for (const b of supplyBatches ?? []) {
    const prev = supplyStock.get(b.supply_id) ?? { qty: 0, value: 0 }
    supplyStock.set(b.supply_id, {
      qty:   prev.qty   + (b.current_quantity ?? 0),
      value: prev.value + (b.current_quantity ?? 0) * (b.unit_price ?? 0),
    })
  }

  // Stock actual por product_id
  const productStock = new Map<string, { qty: number; value: number }>()
  for (const b of productBatches ?? []) {
    const prev = productStock.get(b.product_id) ?? { qty: 0, value: 0 }
    const unitCost = b.unit_cost ?? 0
    productStock.set(b.product_id, {
      qty:   prev.qty   + (b.current_quantity ?? 0),
      value: prev.value + (b.current_quantity ?? 0) * unitCost,
    })
  }

  // ── Vista detalle (entity seleccionado) ─────────────────────────────────────

  if (entity_id) {
    const isSupply = entity_type !== 'producto'
    const entityInfo = isSupply ? supplyMap.get(entity_id) : productMap.get(entity_id)
    const stock = isSupply ? supplyStock.get(entity_id) : productStock.get(entity_id)

    // Movimientos en el período para este artículo
    type MovRow = {
      id: string; movement_type: string; movement_reason: string
      entity_type: string; entity_id: string; quantity: number
      unit_cost: number | null; total_cost: number | null
      notes: string | null; movement_date: string; created_at: string
      unit: UnitRef | null
    }

    const allForEntity = ((movements as MovRow[] | null) ?? []).filter(
      m => m.entity_id === entity_id && m.movement_date >= monthStart
    )

    // Saldo de apertura = stock actual - entradas del período + salidas del período
    const periodEntries = allForEntity.reduce((s, m) => m.movement_type === 'entrada' ? s + m.quantity : s, 0)
    const periodExits   = allForEntity.reduce((s, m) => m.movement_type === 'salida'  ? s + m.quantity : s, 0)
    const currentStock  = stock?.qty ?? 0
    const openingBalance = currentStock - periodEntries + periodExits

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/inventario/kardex?mes=${mesParam}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {entityInfo ? `${entityInfo.name} (${entityInfo.code})` : 'Artículo'}
            </h1>
            <p className="text-muted-foreground capitalize">{mesLabel}</p>
          </div>
          <MonthSelector
            options={monthOptions}
            current={mesParam}
            extraParam={{ entity_id, entity_type: entity_type ?? 'insumo' }}
          />
        </div>

        <KardexDetail
          movements={allForEntity.map(m => ({
            ...m,
            unit_symbol: (m.unit as unknown as UnitRef | null)?.symbol ?? (entityInfo as SupplyRow | ProductRow | undefined)?.unit?.symbol ?? '',
          }))}
          openingBalance={openingBalance}
          currentStock={currentStock}
          currentValue={stock?.value ?? 0}
          unitSymbol={(entityInfo as SupplyRow | ProductRow | undefined)?.unit?.symbol ?? ''}
        />
      </div>
    )
  }

  // ── Vista resumen (todos los artículos) ─────────────────────────────────────

  type MovRow = {
    id: string; movement_type: string; movement_reason: string
    entity_type: string; entity_id: string; quantity: number
    unit_cost: number | null; total_cost: number | null
    notes: string | null; movement_date: string; created_at: string
    unit: UnitRef | null
  }

  const periodMovements = (movements as MovRow[] | null) ?? []

  // Agregar por artículo
  const entityStats = new Map<string, {
    entity_id: string; entity_type: string; name: string; code: string
    unit_symbol: string; entries: number; exits: number; adjustments: number
    current_qty: number; current_value: number
  }>()

  for (const m of periodMovements) {
    if (!entityStats.has(m.entity_id)) {
      const isSupply = m.entity_type === 'insumo'
      const info = isSupply ? supplyMap.get(m.entity_id) : productMap.get(m.entity_id)
      const stock = isSupply ? supplyStock.get(m.entity_id) : productStock.get(m.entity_id)
      entityStats.set(m.entity_id, {
        entity_id: m.entity_id,
        entity_type: m.entity_type,
        name: info?.name ?? 'Desconocido',
        code: info?.code ?? '—',
        unit_symbol: info?.unit?.symbol ?? '',
        entries: 0, exits: 0, adjustments: 0,
        current_qty: stock?.qty ?? 0,
        current_value: stock?.value ?? 0,
      })
    }
    const s = entityStats.get(m.entity_id)!
    if (m.movement_type === 'entrada') s.entries += m.quantity
    else if (m.movement_type === 'salida') s.exits += m.quantity
    else s.adjustments += m.quantity
  }

  // Incluir artículos con stock aunque no tengan movimientos en el período
  for (const [id, stock] of supplyStock) {
    if (!entityStats.has(id)) {
      const info = supplyMap.get(id)
      if (!info) continue
      entityStats.set(id, {
        entity_id: id, entity_type: 'insumo',
        name: info.name, code: info.code,
        unit_symbol: info.unit?.symbol ?? '',
        entries: 0, exits: 0, adjustments: 0,
        current_qty: stock.qty, current_value: stock.value,
      })
    }
  }
  for (const [id, stock] of productStock) {
    if (!entityStats.has(id)) {
      const info = productMap.get(id)
      if (!info) continue
      entityStats.set(id, {
        entity_id: id, entity_type: 'producto',
        name: info.name, code: info.code,
        unit_symbol: info.unit?.symbol ?? '',
        entries: 0, exits: 0, adjustments: 0,
        current_qty: stock.qty, current_value: stock.value,
      })
    }
  }

  const summaryRows = [...entityStats.values()].sort((a, b) =>
    a.entity_type === b.entity_type
      ? a.name.localeCompare(b.name)
      : a.entity_type === 'insumo' ? -1 : 1
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kardex de Inventario</h1>
          <p className="text-muted-foreground capitalize">
            {periodMovements.length} movimientos — {mesLabel}
          </p>
        </div>
        <MonthSelector options={monthOptions} current={mesParam} />
      </div>

      <KardexSummary rows={summaryRows} mesParam={mesParam} />
    </div>
  )
}
