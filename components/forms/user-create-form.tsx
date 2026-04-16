'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { adminCreateUser } from '@/app/actions'

interface EmpleadoOption {
  id: string
  user_id?: string | null
  persona: { nombres: string; apellido_paterno: string } | null
  cargo:   { nombre: string } | null
}

interface UserCreateFormProps {
  empleadosSinAcceso: EmpleadoOption[]
}

export function UserCreateForm({ empleadosSinAcceso }: UserCreateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    email:       '',
    password:    '',
    full_name:   '',
    role:        'panadero' as 'admin' | 'panadero' | 'cajero',
    phone:       '',
    empleado_id: '',
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

  const inputCls = 'w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Nombre Completo <span className="text-red-600">*</span>
        </label>
        <input
          type="text" required value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Ana García"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          type="email" required value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="ana@panaderia.com"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Contraseña <span className="text-red-600">*</span>
        </label>
        <input
          type="password" required minLength={8}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Mínimo 8 caracteres"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Rol en el sistema <span className="text-red-600">*</span>
        </label>
        <select
          required value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
          className={inputCls}
        >
          <option value="panadero">Panadero</option>
          <option value="cajero">Cajero</option>
          <option value="admin">Administrador</option>
        </select>
        <p className="text-xs text-slate-500">El rol define qué partes del sistema puede ver y usar.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Teléfono</label>
        <input
          type="tel" value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="987654321"
          className={inputCls}
        />
      </div>

      {/* Vincular a empleado */}
      <div className="space-y-2 pt-2 border-t">
        <label className="text-sm font-medium">
          Vincular a empleado <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <select
          value={formData.empleado_id}
          onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })}
          className={inputCls}
        >
          <option value="">— Sin vincular —</option>
          {empleadosSinAcceso.map((emp) => {
            const p = emp.persona as { nombres: string; apellido_paterno: string } | null
            const nombre = p ? `${p.nombres} ${p.apellido_paterno}` : 'Sin nombre'
            const cargo  = (emp.cargo as { nombre: string } | null)?.nombre ?? ''
            return (
              <option key={emp.id} value={emp.id}>
                {nombre}{cargo ? ` — ${cargo}` : ''}
              </option>
            )
          })}
        </select>
        {empleadosSinAcceso.length === 0 && (
          <p className="text-xs text-slate-400">Todos los empleados activos ya tienen acceso al sistema.</p>
        )}
        <p className="text-xs text-slate-500">
          Vincula este usuario a su ficha de empleado para mantener los datos conectados.
        </p>
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
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
