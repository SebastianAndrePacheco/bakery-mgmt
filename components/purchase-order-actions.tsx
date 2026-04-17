'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  submitForApproval,
  approveOrder,
  rejectOrder,
  markOrderSent,
  cancelOrder,
} from '@/app/actions'
import { PurchaseOrderApproval } from '@/utils/types/database.types'
import { CheckCircle, XCircle, Send, Truck, Ban, Clock } from 'lucide-react'
import { formatDate } from '@/utils/helpers/dates'

interface PurchaseOrderActionsProps {
  orderId: string
  status: string
  role: string
  approvals: PurchaseOrderApproval[]
}

const actionLabels: Record<string, string> = {
  submitted:  'Enviado a aprobación',
  approved:   'Aprobado',
  rejected:   'Rechazado',
  cancelled:  'Cancelado',
  sent:       'Enviado al proveedor',
}

const actionColors: Record<string, string> = {
  submitted: 'text-blue-600',
  approved:  'text-green-600',
  rejected:  'text-red-600',
  cancelled: 'text-slate-500',
  sent:      'text-purple-600',
}

export function PurchaseOrderActions({ orderId, status, role, approvals }: PurchaseOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  const isAdmin = role === 'admin'

  const run = async (fn: () => Promise<{ error: string } | { success: true }>, successMsg: string) => {
    setLoading(true)
    const result = await fn()
    setLoading(false)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(successMsg)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Panel de acciones según estado */}
      {status === 'borrador' && (
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => run(() => submitForApproval(orderId), 'Orden enviada a aprobación')}
            disabled={loading}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar a aprobación
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancel(true)}
              disabled={loading}
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancelar orden
            </Button>
          )}
        </div>
      )}

      {status === 'pendiente_aprobacion' && isAdmin && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pendiente de tu aprobación
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => run(() => approveOrder(orderId, comment || undefined), 'Orden aprobada')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprobar
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowReject(true)}
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rechazar
            </Button>
          </div>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario (opcional para aprobación)"
            className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {status === 'aprobado' && isAdmin && (
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => run(() => markOrderSent(orderId), 'Orden marcada como enviada al proveedor')}
            disabled={loading}
            variant="outline"
          >
            <Truck className="w-4 h-4 mr-2" />
            Marcar como enviada
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowCancel(true)}
            disabled={loading}
          >
            <Ban className="w-4 h-4 mr-2" />
            Cancelar orden
          </Button>
        </div>
      )}

      {/* Modal rechazo */}
      {showReject && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-700">Motivo del rechazo</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Indica el motivo del rechazo..."
            className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              disabled={!comment.trim() || loading}
              onClick={() => {
                run(() => rejectOrder(orderId, comment), 'Orden rechazada')
                setShowReject(false)
              }}
            >
              Confirmar rechazo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Modal cancelación */}
      {showCancel && (
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">¿Cancelar esta orden?</p>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Motivo de cancelación (opcional)"
            className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={loading}
              onClick={() => {
                run(() => cancelOrder(orderId, comment || undefined), 'Orden cancelada')
                setShowCancel(false)
              }}
            >
              Confirmar cancelación
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {/* Historial de aprobaciones */}
      {approvals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial</p>
          <div className="space-y-1">
            {approvals.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <span className={`font-medium ${actionColors[a.action]}`}>
                  {actionLabels[a.action]}
                </span>
                <span className="text-slate-400">{formatDate(a.created_at)}</span>
                {a.comment && (
                  <span className="text-slate-600 italic">— {a.comment}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
