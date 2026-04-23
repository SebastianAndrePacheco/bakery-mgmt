import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Pagination } from '@/components/ui/pagination'
import { formatDateTime } from '@/utils/helpers/dates'
import { ShieldCheck, LogIn } from 'lucide-react'

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

const SKIP_DIFF = new Set(['updated_at', 'created_at'])

const FIELD_LABELS: Record<string, string> = {
  business_name:          'Razón social',
  ruc:                    'RUC',
  is_active:              'Estado activo',
  status:                 'Estado',
  total:                  'Total',
  subtotal:               'Subtotal',
  tax:                    'IGV',
  role:                   'Rol',
  full_name:              'Nombre completo',
  nombres:                'Nombres',
  apellido_paterno:       'Apellido paterno',
  apellido_materno:       'Apellido materno',
  cargo_id:               'Cargo',
  tipo_contrato:          'Tipo contrato',
  sueldo_base:            'Sueldo base',
  fecha_ingreso:          'Fecha ingreso',
  fecha_cese:             'Fecha cese',
  nombre:                 'Nombre',
  igv:                    'IGV (%)',
  moneda:                 'Moneda',
  razon_social:           'Razón social',
  current_quantity:       'Cantidad actual',
  quantity_produced:      'Cantidad producida',
  production_date:        'Fecha producción',
  order_date:             'Fecha orden',
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
  searchParams: Promise<{
    tipo?: string
    page?: string
    // filtros cambios
    tabla?: string; accion?: string; desde?: string; hasta?: string
    // filtros accesos
    resultado?: string
  }>
}

export default async function AuditoriaPage({ searchParams }: Props) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { tipo, page: pageParam, tabla, accion, desde, hasta, resultado } = await searchParams
  const seccion = tipo === 'accesos' ? 'accesos' : 'cambios'
  const page = Math.max(1, parseInt(pageParam || '1'))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // ── Cambios en el sistema ─────────────────────────────────────────────────
  let logs: Record<string, unknown>[] | null = null
  let logsCount: number | null = null

  if (seccion === 'cambios') {
    let q = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('changed_at', { ascending: false })
      .range(from, to)

    if (tabla)  q = q.eq('table_name', tabla)
    if (accion) q = q.eq('action', accion)
    if (desde)  q = q.gte('changed_at', desde)
    if (hasta)  q = q.lte('changed_at', hasta + 'T23:59:59Z')

    const { data, count } = await q
    logs = data as Record<string, unknown>[] | null
    logsCount = count

    const userIds = [...new Set((logs ?? []).map((l) => (l as {changed_by?: string}).changed_by).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds)
      for (const p of profiles ?? []) {
        ;(logs ?? []).forEach(l => {
          if ((l as {changed_by?: string}).changed_by === p.id) {
            (l as Record<string, unknown>).__userName = p.full_name
          }
        })
      }
    }
  }

  // ── Accesos al sistema ────────────────────────────────────────────────────
  let loginLogs: Record<string, unknown>[] | null = null
  let loginCount: number | null = null

  if (seccion === 'accesos') {
    let q = supabase
      .from('login_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (resultado === 'exitoso')  q = q.eq('success', true)
    if (resultado === 'fallido')  q = q.eq('success', false)
    if (desde) q = q.gte('created_at', desde)
    if (hasta) q = q.lte('created_at', hasta + 'T23:59:59Z')

    const { data, count } = await q
    loginLogs = data as Record<string, unknown>[] | null
    loginCount = count

    // Enriquecer con nombre de usuario
    const userIds = [...new Set(
      (loginLogs ?? [])
        .map((l) => (l as {user_id?: string}).user_id)
        .filter(Boolean)
    )]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds)
      for (const p of profiles ?? []) {
        ;(loginLogs ?? []).forEach(l => {
          if ((l as {user_id?: string}).user_id === p.id) {
            (l as Record<string, unknown>).__userName = p.full_name
          }
        })
      }
    }
  }

  const totalPages = Math.ceil(((seccion === 'cambios' ? logsCount : loginCount) || 0) / PAGE_SIZE)

  const hasFilters = !!(tabla || accion || desde || hasta || resultado)

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Auditoría' }]} />

      <div>
        <h1 className="text-3xl font-bold">Auditoría</h1>
        <p className="text-muted-foreground">Registro de actividad del sistema — hora Lima (UTC−5)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <a
          href="/auditoria?tipo=cambios"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            seccion === 'cambios'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Cambios en el sistema
        </a>
        <a
          href="/auditoria?tipo=accesos"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            seccion === 'accesos'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Accesos al sistema
        </a>
      </div>

      {/* ── CAMBIOS ── */}
      {seccion === 'cambios' && (
        <>
          <Card>
            <CardContent className="pt-4">
              <form method="GET" action="/auditoria" className="flex flex-wrap gap-3 items-end">
                <input type="hidden" name="tipo" value="cambios" />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Entidad</label>
                  <select name="tabla" defaultValue={tabla ?? ''}
                    className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Todas</option>
                    {Object.entries(TABLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Acción</label>
                  <select name="accion" defaultValue={accion ?? ''}
                    className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Todas</option>
                    <option value="INSERT">Creación</option>
                    <option value="UPDATE">Modificación</option>
                    <option value="DELETE">Eliminación</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Desde</label>
                  <input type="date" name="desde" defaultValue={desde ?? ''}
                    className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Hasta</label>
                  <input type="date" name="hasta" defaultValue={hasta ?? ''}
                    className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <button type="submit"
                  className="h-9 px-4 bg-slate-900 text-white rounded-md text-sm hover:bg-slate-700 transition-colors">
                  Filtrar
                </button>
                {hasFilters && (
                  <a href="/auditoria?tipo=cambios"
                    className="h-9 px-4 border border-input rounded-md text-sm flex items-center hover:bg-slate-50 transition-colors">
                    Limpiar
                  </a>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eventos del sistema</CardTitle>
              <CardDescription>{logsCount ?? 0} registros encontrados</CardDescription>
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
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-48">Fecha / Hora (Lima)</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Usuario</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">Entidad</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">Acción</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Registro / Cambios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(logs as Array<{
                        id: string
                        changed_at: string
                        changed_by?: string
                        __userName?: string
                        table_name: string
                        action: string
                        old_data: Record<string, unknown> | null
                        new_data: Record<string, unknown> | null
                      }>).map((log) => {
                        const oldData = log.old_data
                        const newData = log.new_data
                        const displayData = newData ?? oldData
                        const label = recordLabel(log.table_name, displayData)
                        const actionMeta = ACTION_LABELS[log.action] ?? { label: log.action, cls: 'bg-slate-100 text-slate-700' }
                        const userName = log.changed_by ? (log.__userName ?? 'Desconocido') : 'Sistema'
                        const diff = log.action === 'UPDATE' && oldData && newData
                          ? getDiff(oldData, newData)
                          : []

                        return (
                          <tr key={log.id} className="hover:bg-slate-50 align-top">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                              {formatDateTime(log.changed_at)}
                            </td>
                            <td className="px-4 py-3 font-medium">{userName}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {TABLE_LABELS[log.table_name] ?? log.table_name}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionMeta.cls}`}>
                                {actionMeta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{label}</div>
                              {log.action === 'INSERT' && (
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
        </>
      )}

      {/* ── ACCESOS ── */}
      {seccion === 'accesos' && (
        <>
          <Card>
            <CardContent className="pt-4">
              <form method="GET" action="/auditoria" className="flex flex-wrap gap-3 items-end">
                <input type="hidden" name="tipo" value="accesos" />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Resultado</label>
                  <select name="resultado" defaultValue={resultado ?? ''}
                    className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Todos</option>
                    <option value="exitoso">Exitoso</option>
                    <option value="fallido">Fallido</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Desde</label>
                  <input type="date" name="desde" defaultValue={desde ?? ''}
                    className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Hasta</label>
                  <input type="date" name="hasta" defaultValue={hasta ?? ''}
                    className="h-9 px-3 py-1 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <button type="submit"
                  className="h-9 px-4 bg-slate-900 text-white rounded-md text-sm hover:bg-slate-700 transition-colors">
                  Filtrar
                </button>
                {hasFilters && (
                  <a href="/auditoria?tipo=accesos"
                    className="h-9 px-4 border border-input rounded-md text-sm flex items-center hover:bg-slate-50 transition-colors">
                    Limpiar
                  </a>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accesos al sistema</CardTitle>
              <CardDescription>{loginCount ?? 0} intentos registrados</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!loginLogs?.length ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No hay accesos registrados con los filtros actuales.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-48">Fecha / Hora (Lima)</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Usuario</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Correo</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">IP</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(loginLogs as Array<{
                        id: string
                        created_at: string
                        email: string
                        ip: string
                        success: boolean
                        user_id?: string
                        __userName?: string
                      }>).map((log) => (
                        <tr key={log.id} className={`hover:bg-slate-50 ${!log.success ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {log.__userName ?? (log.user_id ? 'Desconocido' : '—')}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{log.email}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.ip}</td>
                          <td className="px-4 py-3">
                            {log.success ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Exitoso
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Fallido
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath={`/auditoria?tipo=${seccion}${tabla ? `&tabla=${tabla}` : ''}${accion ? `&accion=${accion}` : ''}${resultado ? `&resultado=${resultado}` : ''}${desde ? `&desde=${desde}` : ''}${hasta ? `&hasta=${hasta}` : ''}`}
      />
    </div>
  )
}
