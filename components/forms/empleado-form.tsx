'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Cargo, Empleado, Persona } from '@/utils/types/database.types'
import { createEmpleado, updateEmpleado } from '@/app/actions'
import { localDateString } from '@/utils/helpers/currency'
import { toast } from 'sonner'

interface EmpleadoFormProps {
  cargos: Cargo[]
  empleado?: Empleado & { persona?: Persona }
}

const BANCOS = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'BanBif', 'Mibanco', 'Pichincha', 'Otro']

export function EmpleadoForm({ cargos, empleado }: EmpleadoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEdit = !!empleado

  const [persona, setPersona] = useState({
    tipo_doc:         empleado?.persona?.tipo_doc         ?? 'DNI',
    numero_doc:       empleado?.persona?.numero_doc       ?? '',
    nombres:          empleado?.persona?.nombres          ?? '',
    apellido_paterno: empleado?.persona?.apellido_paterno ?? '',
    apellido_materno: empleado?.persona?.apellido_materno ?? '',
    fecha_nacimiento: empleado?.persona?.fecha_nacimiento ?? '',
    genero:           empleado?.persona?.genero           ?? '',
    telefono:         empleado?.persona?.telefono         ?? '',
    email:            empleado?.persona?.email            ?? '',
    direccion:        empleado?.persona?.direccion        ?? '',
  })

  const [laboral, setLaboral] = useState({
    cargo_id:      empleado?.cargo_id      ?? '',
    fecha_ingreso: empleado?.fecha_ingreso ?? localDateString(),
    fecha_cese:    empleado?.fecha_cese    ?? '',
    tipo_contrato: empleado?.tipo_contrato ?? 'indefinido',
    sueldo_base:   empleado?.sueldo_base?.toString() ?? '',
    banco:         empleado?.banco         ?? '',
    tipo_cuenta:   empleado?.tipo_cuenta   ?? '',
    numero_cuenta: empleado?.numero_cuenta ?? '',
    cci:           empleado?.cci           ?? '',
    is_active:     empleado?.is_active     ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      persona: {
        ...persona,
        genero: persona.genero || undefined,
      },
      laboral: {
        ...laboral,
        sueldo_base: laboral.sueldo_base ? parseFloat(laboral.sueldo_base) : null,
        tipo_cuenta: laboral.tipo_cuenta || undefined,
      },
    }

    const result = isEdit
      ? await updateEmpleado(empleado.id, empleado.persona_id, payload)
      : await createEmpleado(payload)

    setLoading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Empleado actualizado' : 'Empleado registrado')
    router.push('/empleados')
    router.refresh()
  }

  const inputCls = 'w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm'
  const labelCls = 'text-sm font-medium'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* DATOS PERSONALES */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Datos personales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Tipo documento <span className="text-red-500">*</span></label>
            <select
              required value={persona.tipo_doc}
              onChange={(e) => setPersona({ ...persona, tipo_doc: e.target.value as 'DNI' | 'CE' | 'Pasaporte' })}
              className={inputCls}
            >
              <option value="DNI">DNI</option>
              <option value="CE">Carné de Extranjería</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>N° documento <span className="text-red-500">*</span></label>
            <input
              required type="text" value={persona.numero_doc}
              maxLength={persona.tipo_doc === 'DNI' ? 8 : 20}
              onChange={(e) => setPersona({ ...persona, numero_doc: e.target.value })}
              placeholder={persona.tipo_doc === 'DNI' ? '12345678' : ''}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Género</label>
            <select
              value={persona.genero}
              onChange={(e) => setPersona({ ...persona, genero: e.target.value })}
              className={inputCls}
            >
              <option value="">Sin especificar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Nombres <span className="text-red-500">*</span></label>
            <input
              required type="text" value={persona.nombres}
              onChange={(e) => setPersona({ ...persona, nombres: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Apellido paterno <span className="text-red-500">*</span></label>
            <input
              required type="text" value={persona.apellido_paterno}
              onChange={(e) => setPersona({ ...persona, apellido_paterno: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Apellido materno</label>
            <input
              type="text" value={persona.apellido_materno}
              onChange={(e) => setPersona({ ...persona, apellido_materno: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Fecha de nacimiento</label>
            <input
              type="date" value={persona.fecha_nacimiento}
              max={localDateString()}
              onChange={(e) => setPersona({ ...persona, fecha_nacimiento: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Teléfono / Celular</label>
            <input
              type="tel" value={persona.telefono}
              onChange={(e) => setPersona({ ...persona, telefono: e.target.value })}
              placeholder="999 999 999"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Correo electrónico</label>
            <input
              type="email" value={persona.email}
              onChange={(e) => setPersona({ ...persona, email: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Dirección</label>
          <input
            type="text" value={persona.direccion}
            onChange={(e) => setPersona({ ...persona, direccion: e.target.value })}
            placeholder="Av. / Jr. / Calle..."
            className={inputCls}
          />
        </div>
      </section>

      {/* DATOS LABORALES */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Datos laborales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Cargo <span className="text-red-500">*</span></label>
            <select
              required value={laboral.cargo_id}
              onChange={(e) => setLaboral({ ...laboral, cargo_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccionar cargo</option>
              {cargos.filter(c => c.is_active).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Tipo de contrato <span className="text-red-500">*</span></label>
            <select
              required value={laboral.tipo_contrato}
              onChange={(e) => setLaboral({ ...laboral, tipo_contrato: e.target.value as typeof laboral.tipo_contrato })}
              className={inputCls}
            >
              <option value="indefinido">Indefinido</option>
              <option value="plazo_fijo">Plazo fijo</option>
              <option value="part_time">Part-time</option>
              <option value="recibo_honorarios">Recibo por honorarios</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Fecha de ingreso <span className="text-red-500">*</span></label>
            <input
              required type="date" value={laboral.fecha_ingreso}
              onChange={(e) => setLaboral({ ...laboral, fecha_ingreso: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Fecha de cese</label>
            <input
              type="date" value={laboral.fecha_cese}
              onChange={(e) => setLaboral({ ...laboral, fecha_cese: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Sueldo base (S/)</label>
            <input
              type="number" step="any" min="0"
              value={laboral.sueldo_base}
              onChange={(e) => setLaboral({ ...laboral, sueldo_base: e.target.value })}
              placeholder="1025.00"
              className={inputCls}
            />
          </div>
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <input
              id="is_active" type="checkbox"
              checked={laboral.is_active}
              onChange={(e) => setLaboral({ ...laboral, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-input"
            />
            <label htmlFor="is_active" className={labelCls}>Empleado activo</label>
          </div>
        )}
      </section>

      {/* DATOS BANCARIOS */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Datos bancarios <span className="text-slate-400 font-normal text-sm">(opcional)</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Banco</label>
            <select
              value={laboral.banco}
              onChange={(e) => setLaboral({ ...laboral, banco: e.target.value })}
              className={inputCls}
            >
              <option value="">Sin banco</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Tipo de cuenta</label>
            <select
              value={laboral.tipo_cuenta}
              onChange={(e) => setLaboral({ ...laboral, tipo_cuenta: e.target.value as 'ahorros' | 'corriente' | '' })}
              className={inputCls}
            >
              <option value="">Sin especificar</option>
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>N° de cuenta</label>
            <input
              type="text" value={laboral.numero_cuenta}
              onChange={(e) => setLaboral({ ...laboral, numero_cuenta: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>CCI <span className="text-slate-400 text-xs">(20 dígitos)</span></label>
            <input
              type="text" maxLength={20} value={laboral.cci}
              onChange={(e) => setLaboral({ ...laboral, cci: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={loading} className="flex-1 md:flex-none md:min-w-40">
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar empleado'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
