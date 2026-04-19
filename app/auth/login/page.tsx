'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, verifyMFALogin } from '@/app/actions'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [mfaData, setMfaData]   = useState<{ factorId: string; challengeId: string } | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await loginUser(email, password)
    setLoading(false)

    if ('error' in result) { setError(result.error); return }
    if ('requiresMfa' in result) {
      setMfaData({ factorId: result.factorId, challengeId: result.challengeId })
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const handleMfa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!mfaData) return
    setLoading(true)
    setError('')

    const result = await verifyMFALogin(mfaData.factorId, mfaData.challengeId, mfaCode)
    setLoading(false)

    if ('error' in result) { setError(result.error); return }
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
        <p className="text-slate-600 text-xs">RUC 20452630371 · Panificadora Ofelia E.I.R.L.</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-black text-lg">P</div>
            <span className="font-bold text-slate-900">Panificadora Ofelia</span>
          </div>

          {mfaData ? (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl font-bold text-slate-900">Verificación 2FA</h2>
                </div>
                <p className="text-slate-500 text-sm">
                  Ingresa el código de 6 dígitos de tu app de autenticación.
                </p>
              </div>
              <form onSubmit={handleMfa} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="mfaCode" className="text-sm font-medium text-slate-700">
                    Código de autenticación
                  </label>
                  <input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm"
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
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-900 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando...</> : 'Verificar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMfaData(null); setError('') }}
                  className="block w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← Volver
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
                <p className="text-slate-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">Correo electrónico</label>
                  <input
                    id="email" type="email" autoComplete="email"
                    placeholder="usuario@panaderia.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
                  <input
                    id="password" type="password" autoComplete="current-password"
                    placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
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
                  type="submit" disabled={loading}
                  className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-900 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</> : 'Ingresar al sistema'}
                </button>
                <a href="/auth/recuperar" className="block text-center text-sm text-slate-500 hover:text-slate-700 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </form>
            </>
          )}

          <p className="text-center text-xs text-slate-400 mt-8">
            Acceso restringido · Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
