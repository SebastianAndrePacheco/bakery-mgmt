import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Pencil } from 'lucide-react'

const roleLabels: Record<string, string> = {
  admin:    'Administrador',
  panadero: 'Panadero',
  cajero:   'Cajero',
}

const roleBadge: Record<string, string> = {
  admin:    'bg-purple-100 text-purple-700',
  panadero: 'bg-amber-100 text-amber-700',
  cajero:   'bg-blue-100 text-blue-700',
}

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Obtener perfiles
  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  // Obtener emails desde auth.users
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()

  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? '']))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestión de accesos al sistema</p>
        </div>
        <Link href="/usuarios/nueva">
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{profiles?.length ?? 0} usuarios registrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Nombre</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Rol</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Teléfono</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Estado</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{p.full_name}</td>
                    <td className="py-3 px-4 text-slate-600 text-sm">{emailMap[p.id] ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadge[p.role] ?? ''}`}>
                        {roleLabels[p.role] ?? p.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-sm">{p.phone ?? '—'}</td>
                    <td className="py-3 px-4">
                      {p.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Activo</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Inactivo</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.id !== user.id && (
                        <Link href={`/usuarios/${p.id}`}>
                          <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
