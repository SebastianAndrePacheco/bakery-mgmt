import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Pagination } from '@/components/ui/pagination'

const PAGE_SIZE = 50

// ── Mapas de etiquetas ───────────────────────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  suppliers:         'Proveedores',
  purchase_orders:   'Órdenes de Compra',
  production_orders: 'Órdenes de Producción',
  supply_batches:    'Lotes de Insumos',
  empleados:         'Empleados',
  personas:          'Personas',
  cargos:            'Cargos',
  user_profiles:     'Usuarios',
  empresa_config:    'Configuración',
}

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  INSERT: { label: 'Creación',      cls: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Modificación',  cls: 'bg-blue-100  text-blue-800'  },
  DELETE: { label: 'Eliminación',   cls: 'bg-red-100   text-red-800'   },
}

// Campos a omitir en el diff (ruido)
const SKIP_DIFF = new Set(['updated_at', 'created_at'])

// Etiquetas amigables para campos comunes
const FIELD_LABELS: Record<string, string> = {
  business_name:     'Razón social',
  ruc:               'RUC',
  is_active:         'Estado activo',
  status:            'Estado',
  total:             'Total',
  subtotal:          'Subtotal',
  tax:               'IGV',
  role:              'Rol',
  full_name:         'Nombre completo',
  nombres:           'Nombres',
  apellido_paterno:  'Apellido paterno',
  apellido_materno:  'Apellido materno',
  cargo_id:          'Cargo',
  tipo_contrato:     'Tipo contrato',
  sueldo_base:       'Sueldo base',
  fecha_ingreso:     'Fecha ingreso',
  fecha_cese:        'Fecha cese',
  nombre:            'Nombre',
  igv:               'IGV (%)',
  moneda:            'Moneda',
  razon_social:      'Razón social',
  current_quantity:  'Cantidad actual',
  quantity_produced: 'Cantidad producida',
  production_date:   'Fecha producción',
  order_date:        'Fecha orden',
  expected_delivery_date: 'Fecha entrega estimada',
}

function fieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ')
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  return String(v)
}

// Extrae el nombre "principal" del registro para mostrarlo en la tabla
function recordLabel(tableName: string, data: Record<string, unknown> | null): string {
  if (!data) return '—'
  const fns: Record<string, (d: Record<string, unknown>) => string> = {
    suppliers:         d => String(d.business_name ?? d.id),
    purchase_orders:   d => String(d.order_number  ?? d.id),
    production_orders: d => String(d.production_date ?? d.id),
    supply_batches:    d => String(d.batch_code    ?? d.id),
    personas:          d => [d.nombres, d.apellido_paterno].filter(Boolean).join(' ') || String(d.id),
    empleados:         d => String(d.id).slice(0, 8) + '…',
    cargos:            d => String(d.nombre        ?? d.id),
    user_profiles:     d => String(d.full_name     ?? d.id),
    empresa_config:    d => String(d.razon_social  ?? d.id),
  }
  return fns[tableName]?.(data) ?? String(data.id ?? '—')
}

// Calcula qué campos cambiaron en un UPDATE
function getDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
) {
  return Object.keys(newData)
    .filter(k => !SKIP_DIFF.has(k) && k !== 'id')
    .filter(k => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]))
    .map(k => ({ key: k, old: oldData[k], next: newData[k] }))
}

// ── Página ───────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ page?: string; tabla?: string; accion?: string; desde?: string; hasta?: string }>
}

export default async function AuditoriaPage({ searchParams }: Props) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Filters
  const { page: pageParam, tabla, accion, desde, hasta } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range(from, to)

  if (tabla)  query = query.eq('table_name', tabla)
  if (accion) query = query.eq('action', accion)
  if (desde)  query = query.gte('changed_at', desde)
  if (hasta)  query = query.lte('changed_at', hasta + 'T23:59:59Z')

  const { data: logs, count } = await query

  // Lookup usuarios para los changed_by únicos
  const userIds = [...new Set((logs ?? []).map(l => l.changed_by).filter(Boolean))]
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds)
    for (const p of profiles ?? []) userMap[p.id] = p.full_name
  }

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  // Build filter URL helpers (server-side only)
  function filterHref(updates: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const current = { tabla, accion, desde, hasta }
    const merged = { ...current, ...updates }
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    return `/auditoria?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Auditoría' }]} />

      <div>
        <h1 className="text-3xl font-bold">Auditoría</h1>
        <p className="text-muted-foreground">Registro de cambios en el sistema</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <form method="GET" action="/auditoria" className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Entidad</label>
              <select
                name="tabla"
                defaultValue={tabla ?? ''}
                className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas</option>
                {Object.entries(TABLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Acción</label>
              <select
                name="accion"
                defaultValue={accion ?? ''}
                className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas</option>
                <option value="INSERT">Creación</option>
                <option value="UPDATE">Modificación</option>
                <option value="DELETE">Eliminación</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Desde</label>
              <input
                type="date" name="desde" defaultValue={desde ?? ''}
                className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Hasta</label>
              <input
                type="date" name="hasta" defaultValue={hasta ?? ''}
                className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              className="h-9 px-4 bg-slate-900 text-white rounded-md text-sm hover:bg-slate-700 transition-colors"
            >
              Filtrar
            </button>
            {(tabla || accion || desde || hasta) && (
              <a
                href="/auditoria"
                className="h-9 px-4 border border-input rounded-md text-sm flex items-center hover:bg-slate-50 transition-colors"
              >
                Limpiar
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
          <CardDescription>{count ?? 0} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!logs?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No hay eventos registrados con los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-44">Fecha / Hora</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">Entidad</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">Acción</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Registro / Cambios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const oldData = log.old_data as Record<string, unknown> | null
                    const newData = log.new_data as Record<string, unknown> | null
                    const displayData = newData ?? oldData
                    const label = recordLabel(log.table_name, displayData)
                    const actionMeta = ACTION_LABELS[log.action] ?? { label: log.action, cls: 'bg-slate-100 text-slate-700' }
                    const userName = log.changed_by ? (userMap[log.changed_by] ?? 'Desconocido') : 'Sistema'
                    const diff = log.action === 'UPDATE' && oldData && newData
                      ? getDiff(oldData, newData)
                      : []

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 align-top">
                        {/* Fecha */}
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.changed_at).toLocaleString('es-PE', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>

                        {/* Usuario */}
                        <td className="px-4 py-3 font-medium">
                          {userName}
                        </td>

                        {/* Entidad */}
                        <td className="px-4 py-3 text-slate-600">
                          {TABLE_LABELS[log.table_name] ?? log.table_name}
                        </td>

                        {/* Acción */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionMeta.cls}`}>
                            {actionMeta.label}
                          </span>
                        </td>

                        {/* Registro / Cambios */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{label}</div>

                          {log.action === 'INSERT' && newData && (
                            <p className="text-xs text-slate-500 mt-0.5">Nuevo registro creado</p>
                          )}

                          {log.action === 'DELETE' && (
                            <p className="text-xs text-slate-500 mt-0.5">Registro eliminado</p>
                          )}

                          {log.action === 'UPDATE' && diff.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {diff.slice(0, 5).map(({ key, old: o, next: n }) => (
                                <div key={key} className="text-xs text-slate-500 flex gap-1.5 flex-wrap">
                                  <span className="font-medium text-slate-700">{fieldLabel(key)}:</span>
                                  <span className="line-through text-red-400">{formatValue(o)}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-green-700">{formatValue(n)}</span>
                                </div>
                              ))}
                              {diff.length > 5 && (
                                <p className="text-xs text-slate-400">…y {diff.length - 5} campo(s) más</p>
                              )}
                            </div>
                          )}

                          {log.action === 'UPDATE' && diff.length === 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">Sin diferencias relevantes</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} basePath="/auditoria" />
    </div>
  )
}
