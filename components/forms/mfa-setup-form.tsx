'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { unenrollMFA } from '@/app/actions'
import { ShieldCheck, ShieldOff, Loader2, AlertCircle, CheckCircle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MfaSetupFormProps {
  hasMfa: boolean
  factorId?: string
}

type Step = 'idle' | 'qr' | 'verify' | 'done'

export function MfaSetupForm({ hasMfa, factorId }: MfaSetupFormProps) {
  const [step, setStep]           = useState<Step>('idle')
  const [qrCode, setQrCode]       = useState('')
  const [secret, setSecret]       = useState('')
  const [enrollId, setEnrollId]   = useState('')
  const [code, setCode]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [enabled, setEnabled]     = useState(hasMfa)
  const [copied, setCopied]       = useState(false)

  const startEnroll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Panificadora Ofelia' })
    setLoading(false)
    if (error || !data) { setError('No se pudo iniciar el registro.'); return }
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setEnrollId(data.id)
    setStep('qr')
  }

  const verifyEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: enrollId })
    if (!challenge) { setError('Error al crear desafío.'); setLoading(false); return }
    const { error } = await supabase.auth.mfa.verify({ factorId: enrollId, challengeId: challenge.id, code })
    setLoading(false)
    if (error) { setError('Código incorrecto. Intenta de nuevo.'); return }
    setEnabled(true)
    setStep('done')
  }

  const handleUnenroll = async () => {
    if (!factorId) return
    setLoading(true)
    setError('')
    const result = await unenrollMFA(factorId)
    setLoading(false)
    if ('error' in result) { setError(result.error); return }
    setEnabled(false)
    setStep('idle')
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'done') {
    return (
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">2FA activado correctamente</p>
          <p className="text-sm text-green-700 mt-1">
            Tu cuenta ahora requiere un código de autenticación en cada inicio de sesión.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'qr') {
    return (
      <div className="space-y-5">
        <div className="text-sm text-slate-600 space-y-1">
          <p>1. Abre tu app de autenticación (Google Authenticator, Authy, etc.)</p>
          <p>2. Escanea el código QR o ingresa la clave manualmente.</p>
          <p>3. Ingresa el código de 6 dígitos que muestra la app.</p>
        </div>

        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="QR 2FA" className="w-48 h-48 border border-slate-200 rounded-lg p-2 bg-white" />
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">Clave manual:</p>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
            <code className="text-xs font-mono flex-1 break-all text-slate-700">{secret}</code>
            <button type="button" onClick={copySecret} className="text-slate-400 hover:text-slate-600 shrink-0">
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <form onSubmit={verifyEnroll} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="code" className="text-sm font-medium text-slate-700">Código de verificación</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => { setStep('idle'); setError('') }} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || code.length !== 6} className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verificando...</> : 'Activar 2FA'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // idle
  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {enabled ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-medium">2FA activado</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnenroll}
            disabled={loading}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldOff className="w-4 h-4 mr-1.5" />Desactivar</>}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldOff className="w-4 h-4" />
            <span>2FA no activado</span>
          </div>
          <Button
            size="sm"
            onClick={startEnroll}
            disabled={loading}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4 mr-1.5" />Activar 2FA</>}
          </Button>
        </div>
      )}
    </div>
  )
}
