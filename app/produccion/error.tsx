'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function ProduccionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ProduccionError]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-sm">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-semibold text-slate-900">Error al cargar la sección</h2>
        <p className="text-sm text-slate-500">
          No se pudieron obtener los datos. Verifica tu conexión e intenta de nuevo.
        </p>
        <Button onClick={reset} variant="outline">Reintentar</Button>
      </div>
    </div>
  )
}
