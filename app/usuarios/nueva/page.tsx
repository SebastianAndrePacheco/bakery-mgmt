import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { UserCreateForm } from '@/components/forms/user-create-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default async function NuevoUsuarioPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6 max-w-xl">
      <Breadcrumb items={[
        { label: 'Usuarios', href: '/usuarios' },
        { label: 'Nuevo Usuario' },
      ]} />
      <div className="flex items-center gap-4">
        <Link href="/usuarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Usuario</h1>
          <p className="text-muted-foreground">Crea un acceso al sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Usuario</CardTitle>
          <CardDescription>
            El usuario podrá iniciar sesión con el email y contraseña que definas aquí.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserCreateForm />
        </CardContent>
      </Card>
    </div>
  )
}
