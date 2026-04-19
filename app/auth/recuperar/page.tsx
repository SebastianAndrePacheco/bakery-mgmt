'use client'

import { useState } from 'react'
import { sendPasswordReset } from '@/app/actions'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function RecuperarPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await sendPasswordReset(email)
    setLoading(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    setSent(true)
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
          <h2 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h2>
          <p className="text-slate-500 text-sm mt-1">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {sent ? (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Correo enviado</p>
              <p className="text-sm text-green-700 mt-1">
                Si existe una cuenta con ese correo, recibirás un enlace en los próximos minutos.
                Revisa también tu carpeta de spam.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="usuario@panaderia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  Enviando...
                </>
              ) : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        <Link
          href="/auth/login"
          className="block text-center text-sm text-slate-500 hover:text-slate-700 mt-6 transition-colors"
        >
          ← Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
