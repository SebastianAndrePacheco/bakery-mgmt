import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { MfaSetupForm } from '@/components/forms/mfa-setup-form'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.[0]

  return (
    <div className="space-y-6 max-w-lg">
      <Breadcrumb items={[{ label: 'Mi perfil' }]} />

      <div>
        <h1 className="text-3xl font-bold">Mi perfil</h1>
        <p className="text-muted-foreground">Configuración de seguridad de tu cuenta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Autenticación de dos factores</CardTitle>
          <CardDescription>
            Añade una capa extra de seguridad. Al activarlo necesitarás un código de tu app
            de autenticación cada vez que inicies sesión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaSetupForm
            hasMfa={!!totpFactor}
            factorId={totpFactor?.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
