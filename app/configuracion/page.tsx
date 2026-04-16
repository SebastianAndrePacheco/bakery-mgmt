import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { EmpresaConfigForm } from '@/components/forms/empresa-config-form'

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: config } = await supabase
    .from('empresa_config')
    .select('*')
    .single()

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb items={[{ label: 'Configuración de la empresa' }]} />

      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Datos legales y configuración fiscal de la empresa</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la empresa</CardTitle>
          <CardDescription>
            Esta información aparece en los documentos generados por el sistema (órdenes de compra, reportes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmpresaConfigForm config={config ?? undefined} />
        </CardContent>
      </Card>
    </div>
  )
}
