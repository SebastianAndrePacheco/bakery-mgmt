'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { adminCreateUser } from '@/app/actions'

export function UserCreateForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    email:     '',
    password:  '',
    full_name: '',
    role:      'panadero' as 'admin' | 'panadero' | 'cajero',
    phone:     '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await adminCreateUser(formData)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/usuarios')
    router.refresh()
  }

  return (
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
          placeholder="Ana García"
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="ana@panaderia.com"
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Contraseña <span className="text-red-600">*</span>
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Mínimo 8 caracteres"
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Rol <span className="text-red-600">*</span>
        </label>
        <select
          required
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
          placeholder="987654321"
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Creando...' : 'Crear Usuario'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
