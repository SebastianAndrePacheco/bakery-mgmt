'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-4 max-w-md px-6">
            <h1 className="text-2xl font-bold text-slate-900">Algo salió mal</h1>
            <p className="text-slate-500 text-sm">
              Ocurrió un error inesperado. Si el problema persiste, contacta al administrador.
            </p>
            {error.digest && (
              <p className="text-xs text-slate-400 font-mono">Ref: {error.digest}</p>
            )}
            <Button onClick={reset}>Intentar de nuevo</Button>
          </div>
        </div>
      </body>
    </html>
  )
}
