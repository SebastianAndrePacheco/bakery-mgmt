'use client'

import { Bell, User, LogOut, AlertTriangle, Clock, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Notification {
  type: 'vencido' | 'critico' | 'pendiente'
  title: string
  desc: string
  href: string
}

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [bellOpen, setBellOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const bellRef = useRef<HTMLDivElement>(null)

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    panadero: 'Panadero',
    cajero: 'Cajero',
  }

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0]
      const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      const { data: { user } } = await supabase.auth.getUser()

      const [
        { data: expired },
        { data: expiring },
        { data: pendingOrders },
        { data: profile },
      ] = await Promise.all([
        supabase.from('supply_batches')
          .select('id')
          .eq('status', 'disponible')
          .gt('current_quantity', 0)
          .not('expiration_date', 'is', null)
          .lt('expiration_date', today),
        supabase.from('supply_batches')
          .select('id')
          .eq('status', 'disponible')
          .gt('current_quantity', 0)
          .not('expiration_date', 'is', null)
          .gte('expiration_date', today)
          .lte('expiration_date', in7days),
        supabase.from('purchase_orders')
          .select('id')
          .in('status', ['pendiente', 'enviado']),
        user
          ? supabase.from('user_profiles').select('full_name, role').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
      ])

      if (profile) {
        setUserName(profile.full_name || '')
        setUserRole(profile.role || '')
      }

      const notifs: Notification[] = []

      if (expired && expired.length > 0) {
        notifs.push({
          type: 'vencido',
          title: `${expired.length} lote${expired.length > 1 ? 's' : ''} vencido${expired.length > 1 ? 's' : ''}`,
          desc: 'Requieren retiro inmediato del inventario',
          href: '/reportes/vencimientos',
        })
      }

      if (expiring && expiring.length > 0) {
        notifs.push({
          type: 'critico',
          title: `${expiring.length} lote${expiring.length > 1 ? 's' : ''} vence${expiring.length === 1 ? '' : 'n'} en ≤ 7 días`,
          desc: 'Usar o registrar antes del vencimiento',
          href: '/reportes/vencimientos',
        })
      }

      if (pendingOrders && pendingOrders.length > 0) {
        notifs.push({
          type: 'pendiente',
          title: `${pendingOrders.length} orden${pendingOrders.length > 1 ? 'es' : ''} de compra pendiente${pendingOrders.length > 1 ? 's' : ''}`,
          desc: 'Sin confirmar recepción',
          href: '/compras/ordenes',
        })
      }

      setNotifications(notifs)
      setLoading(false)
    }

    fetchAll()
  }, [])

  useEffect(() => {
    if (!bellOpen) return
    const handle = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [bellOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const iconForType = (type: Notification['type']) => {
    if (type === 'vencido') return <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
    if (type === 'critico') return <Clock className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
    return <ShoppingCart className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
  }

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Panificadora Ofelia E.I.R.L.</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificaciones */}
        <div ref={bellRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setBellOpen(prev => !prev)}
          >
            <Bell className="w-5 h-5" />
            {!loading && notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-sm text-slate-900">Notificaciones</h3>
                <button onClick={() => setBellOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500 px-4 py-6 text-center">Cargando...</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-slate-500 px-4 py-8 text-center">Sin alertas pendientes</p>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <li key={i}>
                      <Link
                        href={n.href}
                        onClick={() => setBellOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        {iconForType(n.type)}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium">{userName || '—'}</p>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABELS[userRole] || userRole || '—'}
            </p>
          </div>
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        </div>

        {/* Logout */}
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
