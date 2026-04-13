import { createClient } from '@/utils/supabase/server'
import { Sidebar } from './sidebar'

export async function SidebarWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const role = (profile?.role ?? 'cajero') as 'admin' | 'panadero' | 'cajero'

  return <Sidebar role={role} />
}
