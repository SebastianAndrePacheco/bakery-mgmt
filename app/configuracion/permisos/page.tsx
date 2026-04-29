import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PermisosManager } from '@/components/forms/permisos-manager'
import { MODULOS_CONFIGURABLES, TODOS_LOS_SUBMODULOS } from '@/utils/permissions'

export default async function PermisosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: cargos }, { data: permisos }] = await Promise.all([
    supabase.from('cargos').select('id, nombre').eq('is_active', true).order('nombre'),
    supabase.from('cargo_permisos').select('cargo_id, modulo').in('modulo', TODOS_LOS_SUBMODULOS),
  ])

  // Armar mapa: cargo_id → Set de módulos
  const permisosMap: Record<string, string[]> = {}
  for (const p of permisos ?? []) {
    if (!permisosMap[p.cargo_id]) permisosMap[p.cargo_id] = []
    permisosMap[p.cargo_id].push(p.modulo)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={[
        { label: 'Configuración', href: '/configuracion' },
        { label: 'Permisos por cargo' },
      ]} />

      <div>
        <h1 className="text-3xl font-bold">Permisos por cargo</h1>
        <p className="text-muted-foreground">
          Define qué módulos puede ver cada cargo. El rol Administrador siempre tiene acceso total.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Módulos disponibles</CardTitle>
          <CardDescription>
            Marca los módulos que cada cargo puede acceder. Dashboard siempre está habilitado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermisosManager
            cargos={cargos ?? []}
            permisosMap={permisosMap}
            modulos={MODULOS_CONFIGURABLES}
          />
        </CardContent>
      </Card>
    </div>
  )
}
