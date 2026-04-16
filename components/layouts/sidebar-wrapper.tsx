import { createClient } from '@/utils/supabase/server'
import { Sidebar } from './sidebar'
import { TODOS_LOS_MODULOS, MODULOS_CONFIGURABLES } from '@/utils/permissions'

export async function SidebarWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, empleado_id')
    .eq('id', user.id)
    .single()

  // Admin: acceso total
  if (profile?.role === 'admin') {
    return <Sidebar modulos={TODOS_LOS_MODULOS} displayName={profile.full_name} />
  }

  // Sin perfil o sin empleado: solo dashboard
  if (!profile?.empleado_id) {
    return <Sidebar modulos={['dashboard']} displayName={profile?.full_name} />
  }

  // Obtener cargo del empleado
  const { data: empleado } = await supabase
    .from('empleados')
    .select('cargo_id')
    .eq('id', profile.empleado_id)
    .single()

  if (!empleado?.cargo_id) {
    return <Sidebar modulos={['dashboard']} displayName={profile.full_name} />
  }

  // Obtener módulos asignados al cargo
  const { data: permisos } = await supabase
    .from('cargo_permisos')
    .select('modulo')
    .eq('cargo_id', empleado.cargo_id)
    .in('modulo', Object.keys(MODULOS_CONFIGURABLES))

  const modulos = ['dashboard', ...((permisos ?? []).map(p => p.modulo))]

  return <Sidebar modulos={[...new Set(modulos)]} displayName={profile.full_name} />
}
