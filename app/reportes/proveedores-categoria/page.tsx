import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShoppingCart, TrendingDown, Users, DollarSign, Tag } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'
import { ExportButton } from '@/components/ui/export-button'

export default async function ProveedoresCategoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; categoria?: string }>
}) {
  const { anio, categoria } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const year = parseInt(anio || String(now.getFullYear()))
  const yearStart = `${year}-01-01`
  const yearEnd   = `${year}-12-31`

  const { data: rawBatches } = await supabase
    .from('supply_batches')
    .select(`
      id,
      quantity_received,
      unit_price,
      total_cost,
      received_date,
      supplier:suppliers(id, business_name),
      supply:supplies(
        id, name,
        unit:units(symbol),
        category:categories(id, name)
      )
    `)
    .gte('received_date', yearStart)
    .lte('received_date', yearEnd)
    .not('supplier_id', 'is', null)
    .order('received_date', { ascending: false })

  type BatchRow = {
    id: string
    quantity_received: number
    unit_price: number
    total_cost: number
    received_date: string
    supplier: { id: string; business_name: string } | null
    supply: {
      id: string
      name: string
      unit: { symbol: string } | null
      category: { id: string; name: string } | null
    } | null
  }

  type SupplierAgg = {
    supplier_id: string
    supplier_name: string
    total_cost: number
    total_qty: number
    lotes: number
    precios: number[]
    last_date: string
    supplies: Set<string>
    unit_symbol: string
  }

  type CategoryData = {
    category_id: string
    category_name: string
    total: number
    suppliers: {
      supplier_id: string
      supplier_name: string
      total_cost: number
      total_qty: number
      lotes: number
      precio_promedio: number
      precio_min: number
      precio_max: number
      last_date: string
      supplies: string[]
      unit_symbol: string
    }[]
  }

  // Agrupa por categoría → proveedor
  const byCat: Record<string, { name: string; total: number; suppliers: Record<string, SupplierAgg> }> = {}

  for (const b of (rawBatches || []) as unknown as BatchRow[]) {
    const cat = b.supply?.category
    const sup = b.supplier
    if (!cat || !sup) continue

    if (!byCat[cat.id]) byCat[cat.id] = { name: cat.name, total: 0, suppliers: {} }
    byCat[cat.id].total += b.total_cost || 0

    if (!byCat[cat.id].suppliers[sup.id]) {
      byCat[cat.id].suppliers[sup.id] = {
        supplier_id: sup.id,
        supplier_name: sup.business_name,
        total_cost: 0,
        total_qty: 0,
        lotes: 0,
        precios: [],
        last_date: b.received_date,
        supplies: new Set(),
        unit_symbol: b.supply?.unit?.symbol || '',
      }
    }

    const sa = byCat[cat.id].suppliers[sup.id]
    sa.total_cost += b.total_cost || 0
    sa.total_qty  += b.quantity_received || 0
    sa.lotes      += 1
    sa.precios.push(b.unit_price)
    if (b.received_date > sa.last_date) sa.last_date = b.received_date
    if (b.supply?.name) sa.supplies.add(b.supply.name)
  }

  // Convierte a arrays ordenados
  const categoryList: CategoryData[] = Object.entries(byCat)
    .map(([cid, cdata]) => ({
      category_id: cid,
      category_name: cdata.name,
      total: cdata.total,
      suppliers: Object.values(cdata.suppliers)
        .map(s => ({
          ...s,
          precio_promedio: s.precios.reduce((a, b) => a + b, 0) / s.precios.length,
          precio_min: Math.min(...s.precios),
          precio_max: Math.max(...s.precios),
          supplies: Array.from(s.supplies),
        }))
        .sort((a, b) => b.total_cost - a.total_cost),
    }))
    .sort((a, b) => b.total - a.total)

  const filtered = categoria
    ? categoryList.filter(c => c.category_id === categoria)
    : categoryList

  const totalGastado     = categoryList.reduce((s, c) => s + c.total, 0)
  const totalProveedores = new Set(categoryList.flatMap(c => c.suppliers.map(s => s.supplier_id))).size
  const totalLotes       = categoryList.flatMap(c => c.suppliers).reduce((s, p) => s + p.lotes, 0)

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  const exportData = categoryList.flatMap(cat =>
    cat.suppliers.map(s => ({
      categoria:      cat.category_name,
      proveedor:      s.supplier_name,
      insumos:        s.supplies.join(' | '),
      lotes:          String(s.lotes),
      cantidad_total: s.total_qty.toFixed(3),
      total_comprado: s.total_cost.toFixed(2),
      precio_promedio: s.precio_promedio.toFixed(2),
      precio_min:     s.precio_min.toFixed(2),
      precio_max:     s.precio_max.toFixed(2),
      ultima_compra:  s.last_date,
    }))
  )

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Proveedores por Categoría</h1>
          <p className="text-muted-foreground">
            Ranking de proveedores según categoría de insumo — {year}
          </p>
        </div>
        <ExportButton
          filename={`proveedores_categoria_${year}`}
          columns={[
            { label: 'Categoría',        key: 'categoria' },
            { label: 'Proveedor',        key: 'proveedor' },
            { label: 'Insumos',          key: 'insumos' },
            { label: 'N° Lotes',         key: 'lotes' },
            { label: 'Cantidad Total',   key: 'cantidad_total' },
            { label: 'Total (S/)',        key: 'total_comprado' },
            { label: 'Precio Prom.',     key: 'precio_promedio' },
            { label: 'Precio Mín.',      key: 'precio_min' },
            { label: 'Precio Máx.',      key: 'precio_max' },
            { label: 'Última compra',    key: 'ultima_compra' },
          ]}
          data={exportData}
        />
        {/* Selector de año */}
        <div className="flex gap-1">
          {yearOptions.map(y => (
            <Link
              key={y}
              href={`/reportes/proveedores-categoria?anio=${y}${categoria ? `&categoria=${categoria}` : ''}`}
            >
              <Button variant={y === year ? 'default' : 'outline'} size="sm">{y}</Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total Comprado</CardDescription>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-blue-600">{formatCurrency(totalGastado)}</CardTitle>
            <CardDescription className="text-xs">{totalLotes} lotes recibidos</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Proveedores distintos</CardDescription>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-purple-600">{totalProveedores}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Categorías con compras</CardDescription>
              <Tag className="w-4 h-4 text-slate-400" />
            </div>
            <CardTitle className="text-2xl text-green-600">{categoryList.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtro por categoría */}
      {categoryList.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <Link href={`/reportes/proveedores-categoria?anio=${year}`}>
            <Button variant={!categoria ? 'default' : 'outline'} size="sm">Todas</Button>
          </Link>
          {categoryList.map(c => (
            <Link key={c.category_id} href={`/reportes/proveedores-categoria?anio=${year}&categoria=${c.category_id}`}>
              <Button variant={categoria === c.category_id ? 'default' : 'outline'} size="sm">
                {c.category_name}
              </Button>
            </Link>
          ))}
        </div>
      )}

      {/* Sin datos */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="text-center py-16">
            <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No hay compras registradas en {year}</p>
            <p className="text-xs text-slate-400 mt-1">
              Los datos se generan a partir de lotes recibidos con proveedor asignado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sección por categoría */}
      {filtered.map(cat => {
        const bestPriceId = cat.suppliers.length > 1
          ? cat.suppliers.reduce((best, curr) =>
              curr.precio_promedio < best.precio_promedio ? curr : best
            ).supplier_id
          : null

        const topSupplier = cat.suppliers[0]

        return (
          <Card key={cat.category_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingCart className="w-4 h-4 text-slate-400" />
                    {cat.category_name}
                  </CardTitle>
                  <CardDescription>
                    {cat.suppliers.length} proveedor(es) &middot; {formatCurrency(cat.total)} total en {year}
                  </CardDescription>
                </div>
                {/* Indicador principal */}
                <div className="text-right hidden md:block">
                  <p className="text-xs text-slate-500">Mayor proveedor</p>
                  <p className="font-semibold text-slate-800">{topSupplier.supplier_name}</p>
                  <p className="text-xs text-blue-600">{formatCurrency(topSupplier.total_cost)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left py-2 px-3 w-8">#</th>
                      <th className="text-left py-2 px-3">Proveedor</th>
                      <th className="text-left py-2 px-3">Insumos</th>
                      <th className="text-right py-2 px-3">Lotes</th>
                      <th className="text-right py-2 px-3">Total comprado</th>
                      <th className="text-right py-2 px-3">Participación</th>
                      <th className="text-right py-2 px-3">Precio prom.</th>
                      <th className="text-right py-2 px-3">Precio mín.</th>
                      <th className="text-right py-2 px-3">Precio máx.</th>
                      <th className="text-left py-2 px-3">Última compra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cat.suppliers.map((s, i) => {
                      const pct = cat.total > 0 ? (s.total_cost / cat.total) * 100 : 0
                      const hasBestPrice = bestPriceId === s.supplier_id

                      return (
                        <tr
                          key={s.supplier_id}
                          className={`hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-blue-50/30' : ''}`}
                        >
                          {/* Posición */}
                          <td className="py-3 px-3">
                            {i === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                            ) : i === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-white text-xs font-bold">2</span>
                            ) : i === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">3</span>
                            ) : (
                              <span className="text-slate-400 text-xs pl-1">{i + 1}</span>
                            )}
                          </td>

                          {/* Proveedor */}
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900">{s.supplier_name}</div>
                            {hasBestPrice && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded mt-0.5">
                                <TrendingDown className="w-3 h-3" />
                                Mejor precio
                              </span>
                            )}
                          </td>

                          {/* Insumos */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {s.supplies.slice(0, 3).map(name => (
                                <span key={name} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[90px]" title={name}>
                                  {name}
                                </span>
                              ))}
                              {s.supplies.length > 3 && (
                                <span className="text-xs text-slate-400">+{s.supplies.length - 3} más</span>
                              )}
                            </div>
                          </td>

                          {/* Lotes */}
                          <td className="py-3 px-3 text-right text-slate-600">{s.lotes}</td>

                          {/* Total */}
                          <td className="py-3 px-3 text-right">
                            <span className={`font-semibold ${i === 0 ? 'text-blue-700' : 'text-slate-900'}`}>
                              {formatCurrency(s.total_cost)}
                            </span>
                          </td>

                          {/* Participación */}
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-slate-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-slate-400'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-9 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>

                          {/* Precio promedio */}
                          <td className="py-3 px-3 text-right text-slate-700">
                            S/ {s.precio_promedio.toFixed(2)}
                          </td>

                          {/* Precio mínimo */}
                          <td className="py-3 px-3 text-right">
                            <span className={hasBestPrice ? 'text-green-600 font-semibold' : 'text-slate-700'}>
                              S/ {s.precio_min.toFixed(2)}
                            </span>
                          </td>

                          {/* Precio máximo */}
                          <td className="py-3 px-3 text-right text-slate-500">
                            S/ {s.precio_max.toFixed(2)}
                          </td>

                          {/* Última compra */}
                          <td className="py-3 px-3 text-slate-500 text-xs whitespace-nowrap">
                            {formatDate(s.last_date)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
