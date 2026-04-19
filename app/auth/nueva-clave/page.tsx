'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { updatePassword } from '@/app/actions'
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'

function NuevaClaveForm() {
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [exchanging, setExchanging]     = useState(true)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)

  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Enlace inválido o expirado. Solicita uno nuevo.')
      setExchanging(false)
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('El enlace ha expirado o ya fue usado. Solicita uno nuevo.')
      }
      setExchanging(false)
    })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError('')

    const result = await updatePassword(password)
    setLoading(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/auth/login'), 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-black text-lg">
            P
          </div>
          <span className="font-bold text-slate-900">Panificadora Ofelia</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Nueva contraseña</h2>
          <p className="text-slate-500 text-sm mt-1">
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>

        {success ? (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Contraseña actualizada</p>
              <p className="text-sm text-green-700 mt-1">
                Tu contraseña fue cambiada exitosamente. Serás redirigido al inicio de sesión.
              </p>
            </div>
          </div>
        ) : exchanging ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Verificando enlace...</span>
          </div>
        ) : error && !password ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
            <a
              href="/auth/recuperar"
              className="block text-center text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
            >
              Solicitar nuevo enlace
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm"
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
                  Guardando...
                </>
              ) : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        <a
          href="/auth/login"
          className="block text-center text-sm text-slate-500 hover:text-slate-700 mt-6 transition-colors"
        >
          ← Volver al inicio de sesión
        </a>
      </div>
    </div>
  )
}

export default function NuevaClavePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    }>
      <NuevaClaveForm />
    </Suspense>
  )
}
