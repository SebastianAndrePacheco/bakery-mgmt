'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { adminUpdateUser, adminResetPassword } from '@/app/actions'

interface UserEditFormProps {
  userId: string
  defaultValues: {
    full_name: string
    role:      'admin' | 'panadero' | 'cajero'
    phone:     string
    is_active: boolean
  }
}

export function UserEditForm({ userId, defaultValues }: UserEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState(defaultValues)
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const result = await adminUpdateUser(userId, formData)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess('Usuario actualizado correctamente')
    setLoading(false)
  }

  const handlePasswordReset = async () => {
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setChangingPassword(true)
    setError(null)
    setSuccess(null)

    const result = await adminResetPassword(userId, newPassword)

    if ('error' in result) {
      setError(result.error)
    } else {
      setSuccess('Contraseña cambiada correctamente')
      setNewPassword('')
    }
    setChangingPassword(false)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Nombre Completo <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rol</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'panadero' | 'cajero' })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="panadero">Panadero</option>
            <option value="cajero">Cajero</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Teléfono</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-input"
          />
          <label htmlFor="is_active" className="text-sm font-medium">
            Usuario activo
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {success}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/usuarios')}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      </form>

      <div className="border-t pt-6 space-y-3">
        <p className="text-sm font-medium text-slate-700">Cambiar Contraseña</p>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handlePasswordReset}
            disabled={changingPassword || newPassword.length === 0}
          >
            {changingPassword ? 'Cambiando...' : 'Cambiar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
