'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser } from '@/app/actions'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await loginUser(email, password)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-black text-xl">
              P
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Panificadora Ofelia</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Sistema de Gestión<br />
            <span className="text-amber-400">Integrado</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Control de inventario, producción, compras y reportes para Panificadora Ofelia E.I.R.L.
          </p>
        </div>

        {/* Stats decorativos */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Inventario en tiempo real', value: 'Stock' },
            { label: 'Trazabilidad FIFO', value: 'Lotes' },
            { label: 'Reportes analíticos', value: 'KPIs' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-amber-400 font-bold text-sm mb-1">{s.value}</div>
              <div className="text-slate-400 text-xs leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-xs">
          RUC 20452630371 · Panificadora Ofelia E.I.R.L.
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-black text-lg">
              P
            </div>
            <span className="font-bold text-slate-900">Panificadora Ofelia</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@panaderia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow shadow-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-900 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            Acceso restringido · Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
