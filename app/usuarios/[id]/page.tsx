import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { UserEditForm } from '@/components/forms/user-edit-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (myProfile?.role !== 'admin') redirect('/dashboard')
  if (id === user.id) redirect('/usuarios')

  const [
    { data: profile },
    { data: authUser },
    { data: empleadosSinAcceso },
  ] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('id', id).single(),
    supabaseAdmin.auth.admin.getUserById(id),
    // Empleados sin usuario O el que ya tiene este usuario (para mostrarlo seleccionado)
    supabaseAdmin
      .from('empleados')
      .select(`id, user_id, persona:personas(nombres, apellido_paterno), cargo:cargos(nombre)`)
      .or(`user_id.is.null,user_id.eq.${id}`)
      .eq('is_active', true)
      .order('created_at'),
  ])

  if (!profile) notFound()

  const email = authUser.user?.email ?? ''

  return (
    <div className="space-y-6 max-w-xl">
      <Breadcrumb items={[
        { label: 'Usuarios', href: '/usuarios' },
        { label: profile.full_name || email },
      ]} />
      <div className="flex items-center gap-4">
        <Link href="/usuarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Usuario</h1>
          <p className="text-muted-foreground">{email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <UserEditForm
            userId={id}
            defaultValues={{
              full_name:   profile.full_name,
              role:        profile.role,
              phone:       profile.phone ?? '',
              is_active:   profile.is_active,
              empleado_id: profile.empleado_id ?? '',
            }}
            empleados={(empleadosSinAcceso ?? []) as unknown as Parameters<typeof UserEditForm>[0]['empleados']}
          />
        </CardContent>
      </Card>
    </div>
  )
}
