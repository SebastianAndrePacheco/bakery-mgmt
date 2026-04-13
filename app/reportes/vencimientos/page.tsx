import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/utils/helpers/dates'

export default async function VencimientosPage() {
  const supabase = await createClient()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in7days = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]
  const in30days = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0]

  // Lotes de insumos con fecha de vencimiento
  const { data: supplyBatches } = await supabase
    .from('supply_batches')
    .select(`
      id, batch_number, expiration_date, current_quantity, unit_price,
      supply:supplies(id, code, name, unit:units(symbol))
    `)
    .eq('status', 'disponible')
    .gt('current_quantity', 0)
    .not('expiration_date', 'is', null)
    .lte('expiration_date', in30days)
    .order('expiration_date', { ascending: true })

  // Lotes de productos terminados
  const { data: productBatches } = await supabase
    .from('production_batches')
    .select(`
      id, batch_code, expiration_date, current_quantity, unit_cost,
      product:products(id, code, name, unit:units(symbol))
    `)
    .eq('status', 'disponible')
    .gt('current_quantity', 0)
    .not('expiration_date', 'is', null)
    .lte('expiration_date', in30days)
    .order('expiration_date', { ascending: true })

  const classify = (exp: string) => {
    if (exp < todayStr) return 'vencido'
    if (exp <= in7days) return 'critico'
    return 'proximo'
  }

  const supplyExpired  = (supplyBatches || []).filter(b => classify(b.expiration_date) === 'vencido')
  const supplyCritical = (supplyBatches || []).filter(b => classify(b.expiration_date) === 'critico')
  const supplyWarning  = (supplyBatches || []).filter(b => classify(b.expiration_date) === 'proximo')

  const productExpired  = (productBatches || []).filter(b => classify(b.expiration_date) === 'vencido')
  const productCritical = (productBatches || []).filter(b => classify(b.expiration_date) === 'critico')
  const productWarning  = (productBatches || []).filter(b => classify(b.expiration_date) === 'proximo')

  const totalCritical = supplyExpired.length + supplyCritical.length + productExpired.length + productCritical.length

  const daysUntil = (exp: string) => {
    const diff = Math.ceil((new Date(exp).getTime() - today.getTime()) / 86400000)
    return diff
  }

  const BadgeRow = ({ batch, type }: { batch: any; type: 'supply' | 'product' }) => {
    const status = classify(batch.expiration_date)
    const days = daysUntil(batch.expiration_date)
    const entity = type === 'supply' ? batch.supply : batch.product
    const code = type === 'supply' ? batch.batch_number : batch.batch_code
    return (
      <tr className="hover:bg-slate-50">
        <td className="py-3 px-4 font-mono text-sm text-slate-600">{code}</td>
        <td className="py-3 px-4">
          <div className="font-medium text-slate-900">{entity?.name}</div>
          <div className="text-xs text-slate-500">{entity?.code}</div>
        </td>
        <td className="py-3 px-4 text-right font-semibold text-slate-700">
          {(batch.current_quantity || 0).toFixed(2)} {entity?.unit?.symbol}
        </td>
        <td className="py-3 px-4 text-center">
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
            status === 'vencido'  ? 'bg-red-100 text-red-700' :
            status === 'critico'  ? 'bg-orange-100 text-orange-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {status === 'vencido' ? 'VENCIDO' :
             status === 'critico' ? `${days}d` : `${days}d`}
          </span>
        </td>
        <td className="py-3 px-4 text-center text-sm text-slate-600">
          {formatDate(batch.expiration_date)}
        </td>
      </tr>
    )
  }

  const TableWrapper = ({ items, type, emptyMsg }: { items: any[]; type: 'supply' | 'product'; emptyMsg: string }) =>
    items.length === 0 ? null : (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm">Lote</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Artículo</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Stock</th>
              <th className="text-center py-3 px-4 font-semibold text-sm">Estado</th>
              <th className="text-center py-3 px-4 font-semibold text-sm">Vence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(b => <BadgeRow key={b.id} batch={b} type={type} />)}
          </tbody>
        </table>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Control de Vencimientos</h1>
          <p className="text-muted-foreground">Lotes próximos a vencer en los próximos 30 días</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={totalCritical > 0 ? 'border-2 border-red-300 bg-red-50' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <CardDescription className="text-red-700">Vencidos o críticos (≤7d)</CardDescription>
            </div>
            <CardTitle className="text-3xl text-red-600">{totalCritical}</CardTitle>
            <CardDescription className="text-xs text-red-600">lotes que requieren acción inmediata</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <CardDescription>Próximos a vencer (8–30d)</CardDescription>
            </div>
            <CardTitle className="text-3xl text-yellow-600">
              {supplyWarning.length + productWarning.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <CardDescription>Total lotes monitoreados</CardDescription>
            </div>
            <CardTitle className="text-3xl text-green-600">
              {(supplyBatches?.length || 0) + (productBatches?.length || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Vencidos */}
      {(supplyExpired.length > 0 || productExpired.length > 0) && (
        <Card className="border-2 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              VENCIDOS — Retirar inmediatamente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TableWrapper items={supplyExpired} type="supply" emptyMsg="" />
            <TableWrapper items={productExpired} type="product" emptyMsg="" />
          </CardContent>
        </Card>
      )}

      {/* Críticos ≤7 días */}
      {(supplyCritical.length > 0 || productCritical.length > 0) && (
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Crítico — Vencen en 7 días o menos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TableWrapper items={supplyCritical} type="supply" emptyMsg="" />
            <TableWrapper items={productCritical} type="product" emptyMsg="" />
          </CardContent>
        </Card>
      )}

      {/* Próximos (8–30 días) */}
      {(supplyWarning.length > 0 || productWarning.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-700 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Próximos a Vencer — 8 a 30 días
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TableWrapper items={supplyWarning} type="supply" emptyMsg="" />
            <TableWrapper items={productWarning} type="product" emptyMsg="" />
          </CardContent>
        </Card>
      )}

      {(supplyBatches?.length === 0 && productBatches?.length === 0) && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Sin vencimientos próximos</p>
            <p className="text-slate-500 text-sm">Todos los lotes tienen fecha de vencimiento mayor a 30 días</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
