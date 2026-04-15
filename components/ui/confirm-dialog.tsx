'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

interface ConfirmDialogProps {
  open: boolean
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, options, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  const colors = {
    danger:  { icon: 'text-red-600',    btn: 'bg-red-600 hover:bg-red-700 text-white', border: 'border-red-100' },
    warning: { icon: 'text-amber-500',  btn: 'bg-amber-500 hover:bg-amber-600 text-white', border: 'border-amber-100' },
    default: { icon: 'text-slate-600',  btn: 'bg-slate-900 hover:bg-slate-800 text-white', border: 'border-slate-100' },
  }
  const c = colors[options.variant ?? 'default']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className={`relative z-10 bg-white rounded-xl shadow-2xl border ${c.border} w-full max-w-md mx-4 p-6`}>
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 flex-shrink-0 ${c.icon}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">{options.title}</h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{options.description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {options.cancelLabel ?? 'Cancelar'}
          </Button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${c.btn}`}
          >
            {options.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook to use ConfirmDialog imperatively
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmOptions
    resolve: ((v: boolean) => void) | null
  }>({ open: false, options: { title: '', description: '' }, resolve: null })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state.resolve?.(true)
    setState(s => ({ ...s, open: false, resolve: null }))
  }

  const handleCancel = () => {
    state.resolve?.(false)
    setState(s => ({ ...s, open: false, resolve: null }))
  }

  const dialog = (
    <ConfirmDialog
      open={state.open}
      options={state.options}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, dialog }
}
