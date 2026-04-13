import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'
import { formatDate } from '@/utils/helpers/dates'
import { MonthSelector } from '@/components/ui/month-selector'

export default async function ComprasProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const supabase = await createClient()

  // Calcular rango de fechas
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1

  if (mes) {
    const [y, m] = mes.split('-').map(Number)
    if (y && m) { year = y; month = m }
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]

  const mesLabel = new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select(`
      id, order_number, order_date, total, status,
      supplier:suppliers(id, business_name)
    `)
    .gte('order_date', monthStart)
    .lte('order_date', monthEnd)
    .in('status', ['recibido_completo', 'recibido_parcial', 'pendiente', 'enviado'])
    .order('order_date', { ascending: false })

  // Agrupar por proveedor
  const bySupplier: Record<string, { name: string; orders: any[]; total: number; received: number }> = {}
  for (const o of orders || []) {
    const sid = (o.supplier as any)?.id
    const sname = (o.supplier as any)?.business_name || 'Desconocido'
    if (!bySupplier[sid]) bySupplier[sid] = { name: sname, orders: [], total: 0, received: 0 }
    bySupplier[sid].orders.push(o)
    bySupplier[sid].total += o.total || 0
    if (o.status === 'recibido_completo' || o.status === 'recibido_parcial') {
      bySupplier[sid].received += o.total || 0
    }
  }

  const supplierList = Object.values(bySupplier).sort((a, b) => b.total - a.total)
  const totalCompras = supplierList.reduce((s, x) => s + x.total, 0)
  const totalRecibido = supplierList.reduce((s, x) => s + x.received, 0)

  // Meses para el selector
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Compras por Proveedor</h1>
          <p className="text-muted-foreground capitalize">{mesLabel}</p>
        </div>
        <MonthSelector options={monthOptions} current={mes || monthOptions[0].value} />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Órdenes</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{formatCurrency(totalCompras)}</CardTitle>
            <CardDescription className="text-xs">{orders?.length || 0} órdenes</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Recibido</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(totalRecibido)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Proveedores Activos</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{supplierList.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Por proveedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Detalle por Proveedor
          </CardTitle>
          <CardDescription>Ordenado por mayor monto de compra</CardDescription>
        </CardHeader>
        <CardContent>
          {supplierList.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No hay compras registradas en este período</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplierList.map((supplier) => {
                const pct = totalCompras > 0 ? (supplier.total / totalCompras) * 100 : 0
                return (
                  <div key={supplier.name} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">{supplier.name}</h3>
                        <p className="text-xs text-slate-500">{supplier.orders.length} orden(es)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(supplier.total)}</p>
                        <p className="text-xs text-slate-500">{pct.toFixed(1)}% del total</p>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {/* Órdenes */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 text-xs">
                            <th className="text-left py-1 px-2">N° Orden</th>
                            <th className="text-left py-1 px-2">Fecha</th>
                            <th className="text-left py-1 px-2">Estado</th>
                            <th className="text-right py-1 px-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplier.orders.map((o: any) => (
                            <tr key={o.id} className="border-t border-slate-100">
                              <td className="py-1.5 px-2 font-mono text-slate-700">{o.order_number}</td>
                              <td className="py-1.5 px-2 text-slate-600">{formatDate(o.order_date)}</td>
                              <td className="py-1.5 px-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  o.status === 'recibido_completo' ? 'bg-green-100 text-green-700' :
                                  o.status === 'recibido_parcial' ? 'bg-yellow-100 text-yellow-700' :
                                  o.status === 'enviado' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {o.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold">{formatCurrency(o.total || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
