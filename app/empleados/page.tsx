import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import Link from 'next/link'
import { Plus, UserCheck, UserX } from 'lucide-react'

export default async function EmpleadosPage() {
  const supabase = await createClient()

  const { data: empleados } = await supabase
    .from('empleados')
    .select(`
      id, fecha_ingreso, tipo_contrato, is_active,
      persona:personas(nombres, apellido_paterno, apellido_materno, tipo_doc, numero_doc, telefono, email),
      cargo:cargos(nombre)
    `)
    .order('created_at', { ascending: false })

  const activos   = empleados?.filter(e => e.is_active).length ?? 0
  const inactivos = (empleados?.length ?? 0) - activos

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Empleados' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empleados</h1>
          <p className="text-muted-foreground">Gestión del personal</p>
        </div>
        <Link href="/empleados/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Empleado
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{empleados?.length ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total empleados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activos}</div>
            <p className="text-sm text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-400">{inactivos}</div>
            <p className="text-sm text-muted-foreground">Inactivos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Personal registrado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!empleados?.length ? (
            <div className="py-12 text-center text-slate-500">
              <UserCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No hay empleados registrados</p>
              <Link href="/empleados/nuevo">
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="w-4 h-4 mr-2" /> Registrar primer empleado
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Empleado</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Documento</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Cargo</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Contrato</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Ingreso</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {empleados.map((emp) => {
                    const p = emp.persona as unknown as { nombres: string; apellido_paterno: string; apellido_materno?: string; tipo_doc: string; numero_doc: string; telefono?: string; email?: string } | null
                    const nombreCompleto = p
                      ? `${p.nombres} ${p.apellido_paterno}${p.apellido_materno ? ' ' + p.apellido_materno : ''}`
                      : '—'
                    const cargo = emp.cargo as unknown as { nombre: string } | null

                    const contratoLabel: Record<string, string> = {
                      indefinido:         'Indefinido',
                      plazo_fijo:         'Plazo fijo',
                      part_time:          'Part-time',
                      recibo_honorarios:  'Rec. honorarios',
                    }

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {p ? p.nombres.charAt(0) + p.apellido_paterno.charAt(0) : '?'}
                            </div>
                            <div>
                              <div className="font-medium">{nombreCompleto}</div>
                              {p?.email && <div className="text-xs text-slate-500">{p.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {p ? `${p.tipo_doc} ${p.numero_doc}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {cargo?.nombre ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {contratoLabel[emp.tipo_contrato] ?? emp.tipo_contrato}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(emp.fecha_ingreso + 'T00:00:00').toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-4 py-3">
                          {emp.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <UserCheck className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              <UserX className="w-3 h-3" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/empleados/${emp.id}`}>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </Link>
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
    </div>
  )
}
