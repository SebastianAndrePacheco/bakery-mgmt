'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { adminCreateUser } from '@/app/actions'
import { UserCheck } from 'lucide-react'

interface PersonaData {
  nombres:           string
  apellido_paterno:  string
  apellido_materno?: string | null
  telefono?:         string | null
  email?:            string | null
}

interface EmpleadoOption {
  id:       string
  persona:  PersonaData | null
  cargo:    { nombre: string } | null
}

interface UserCreateFormProps {
  empleadosSinAcceso: EmpleadoOption[]
}

export function UserCreateForm({ empleadosSinAcceso }: UserCreateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [autoFilled, setAutoFilled] = useState(false)

  const [formData, setFormData] = useState({
    email:       '',
    password:    '',
    full_name:   '',
    role:        'cajero' as 'admin' | 'cajero',
    phone:       '',
    empleado_id: '',
  })

  const handleEmpleadoChange = (empleadoId: string) => {
    if (!empleadoId) {
      setFormData(prev => ({ ...prev, empleado_id: '' }))
      setAutoFilled(false)
      return
    }

    const emp = empleadosSinAcceso.find(e => e.id === empleadoId)
    if (!emp?.persona) {
      setFormData(prev => ({ ...prev, empleado_id: empleadoId }))
      return
    }

    const p = emp.persona
    const apellidos = [p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ')
    const fullName  = `${p.nombres} ${apellidos}`.trim()

    setFormData(prev => ({
      ...prev,
      empleado_id: empleadoId,
      full_name:   fullName,
      phone:       p.telefono  ?? prev.phone,
      email:       p.email     ?? prev.email,
    }))
    setAutoFilled(true)
  }

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

      {/* ── Selección de empleado (al inicio para auto-completar) ── */}
      <div className="space-y-2 pb-4 border-b">
        <label className="text-sm font-medium">
          Vincular a empleado existente{' '}
          <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <select
          value={formData.empleado_id}
          onChange={(e) => handleEmpleadoChange(e.target.value)}
          className={inputCls}
        >
          <option value="">— Seleccionar empleado —</option>
          {empleadosSinAcceso.map((emp) => {
            const p      = emp.persona
            const nombre = p ? `${p.nombres} ${p.apellido_paterno}` : 'Sin nombre'
            const cargo  = emp.cargo?.nombre ?? ''
            return (
              <option key={emp.id} value={emp.id}>
                {nombre}{cargo ? ` — ${cargo}` : ''}
              </option>
            )
          })}
        </select>

        {empleadosSinAcceso.length === 0 && (
          <p className="text-xs text-slate-400">
            Todos los empleados activos ya tienen acceso al sistema.
          </p>
        )}

        {autoFilled && (
          <p className="flex items-center gap-1.5 text-xs text-green-700">
            <UserCheck className="w-3.5 h-3.5" />
            Datos completados desde la ficha del empleado — puedes editarlos si es necesario.
          </p>
        )}
      </div>

      {/* ── Datos del usuario ── */}
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
        <label className="text-sm font-medium">Teléfono</label>
        <input
          type="tel" value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="987654321"
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
          <option value="cajero">Usuario</option>
          <option value="admin">Administrador</option>
        </select>
        <p className="text-xs text-slate-500">
          El acceso detallado a módulos se configura por cargo en{' '}
          <a href="/configuracion/permisos" className="underline text-blue-600">Configuración → Permisos</a>.
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
