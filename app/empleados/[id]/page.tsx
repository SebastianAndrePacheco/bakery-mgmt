import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { EmpleadoForm } from '@/components/forms/empleado-form'
import { Monitor, MonitorOff } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EmpleadoDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: empleado }, { data: cargos }] = await Promise.all([
    supabase
      .from('empleados')
      .select(`
        *,
        persona:personas(*),
        cargo:cargos(nombre),
        user_profile:user_profiles!user_profiles_empleado_id_fkey(id, full_name, role)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('cargos')
      .select('*')
      .order('nombre'),
  ])

  if (!empleado) notFound()

  const p = empleado.persona as { nombres: string; apellido_paterno: string; apellido_materno?: string } | null
  const nombreCompleto = p
    ? `${p.nombres} ${p.apellido_paterno}${p.apellido_materno ? ' ' + p.apellido_materno : ''}`
    : 'Empleado'

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Empleados', href: '/empleados' },
        { label: nombreCompleto },
      ]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{nombreCompleto}</h1>
          <p className="text-muted-foreground">
            {(empleado.cargo as { nombre: string } | null)?.nombre ?? 'Sin cargo asignado'}
          </p>
        </div>
        {empleado.user_id ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
            <Monitor className="w-4 h-4" />
            <span>Con acceso al sistema</span>
            <Link href={`/usuarios/${empleado.user_id}`} className="underline text-xs ml-1">
              ver usuario
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-sm">
            <MonitorOff className="w-4 h-4" />
            <span>Sin acceso al sistema</span>
            <Link href="/usuarios/nueva" className="underline text-xs ml-1 text-slate-600">
              crear acceso
            </Link>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar ficha</CardTitle>
          <CardDescription>Modifica los datos del empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <EmpleadoForm cargos={cargos ?? []} empleado={empleado as Parameters<typeof EmpleadoForm>[0]['empleado']} />
        </CardContent>
      </Card>
    </div>
  )
}
