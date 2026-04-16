'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Supplier } from '@/utils/types/database.types'
import { createSupplier, updateSupplier } from '@/app/actions'
import { toast } from 'sonner'

interface SupplierFormProps {
  supplier?: Supplier
}

const TIPOS_PROVEEDOR = ['Persona Natural', 'EIRL', 'SAC', 'SRL', 'SA', 'SAA', 'Otro']
const BANCOS = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'BanBif', 'Mibanco', 'Pichincha', 'Otro']

export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEdit = !!supplier

  const [empresa, setEmpresa] = useState({
    business_name:    supplier?.business_name    ?? '',
    ruc:              supplier?.ruc              ?? '',
    nombre_comercial: supplier?.nombre_comercial ?? '',
    tipo_proveedor:   supplier?.tipo_proveedor   ?? '',
    estado_sunat:     supplier?.estado_sunat     ?? '',
    condicion_sunat:  supplier?.condicion_sunat  ?? '',
    direccion_fiscal: supplier?.direccion_fiscal ?? supplier?.address ?? '',
    telefono_empresa: supplier?.telefono_empresa ?? supplier?.phone   ?? '',
    email_empresa:    supplier?.email_empresa    ?? supplier?.email   ?? '',
    web:              supplier?.web              ?? '',
  })

  const [contacto, setContacto] = useState({
    contact_name:     supplier?.contact_name     ?? '',
    contact_cargo:    supplier?.contact_cargo    ?? '',
    contact_dni:      supplier?.contact_dni      ?? '',
    contact_phone:    supplier?.contact_phone    ?? supplier?.phone ?? '',
    contact_email:    supplier?.contact_email    ?? supplier?.email ?? '',
    contact_whatsapp: supplier?.contact_whatsapp ?? '',
  })

  const [pago, setPago] = useState({
    banco:         supplier?.banco         ?? '',
    tipo_cuenta:   supplier?.tipo_cuenta   ?? '',
    numero_cuenta: supplier?.numero_cuenta ?? '',
    cci:           supplier?.cci           ?? '',
    moneda:        supplier?.moneda        ?? 'PEN',
  })

  const [is_active, setIsActive] = useState(supplier?.is_active ?? true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...empresa,
      ...contacto,
      pago,
      banco:         pago.banco         || undefined,
      tipo_cuenta:   pago.tipo_cuenta   as 'ahorros' | 'corriente' | undefined || undefined,
      numero_cuenta: pago.numero_cuenta || undefined,
      cci:           pago.cci           || undefined,
      moneda:        pago.moneda        || 'PEN',
      // legacy
      phone: contacto.contact_phone || empresa.telefono_empresa || '',
      email: contacto.contact_email || empresa.email_empresa    || '',
      address: empresa.direccion_fiscal || '',
      is_active,
    }

    const result = isEdit
      ? await updateSupplier(supplier.id, payload)
      : await createSupplier(payload)

    setLoading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor registrado')
    router.push('/compras/proveedores')
    router.refresh()
  }

  const inputCls = 'w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm'
  const labelCls = 'text-sm font-medium'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* DATOS DE LA EMPRESA */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Datos de la empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Razón Social <span className="text-red-500">*</span></label>
            <input
              required type="text" value={empresa.business_name}
              onChange={(e) => setEmpresa({ ...empresa, business_name: e.target.value })}
              placeholder="EMPRESA S.A.C."
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Nombre Comercial</label>
            <input
              type="text" value={empresa.nombre_comercial}
              onChange={(e) => setEmpresa({ ...empresa, nombre_comercial: e.target.value })}
              placeholder="Nombre de fantasía"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>RUC <span className="text-slate-400 text-xs">(11 dígitos)</span></label>
            <input
              type="text" maxLength={11} value={empresa.ruc}
              onChange={(e) => setEmpresa({ ...empresa, ruc: e.target.value.replace(/\D/g, '') })}
              placeholder="20123456789"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Tipo de proveedor</label>
            <select
              value={empresa.tipo_proveedor}
              onChange={(e) => setEmpresa({ ...empresa, tipo_proveedor: e.target.value })}
              className={inputCls}
            >
              <option value="">Sin especificar</option>
              {TIPOS_PROVEEDOR.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Moneda</label>
            <select
              value={pago.moneda}
              onChange={(e) => setPago({ ...pago, moneda: e.target.value })}
              className={inputCls}
            >
              <option value="PEN">Soles (PEN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Estado SUNAT</label>
            <select
              value={empresa.estado_sunat}
              onChange={(e) => setEmpresa({ ...empresa, estado_sunat: e.target.value })}
              className={inputCls}
            >
              <option value="">Sin datos</option>
              <option value="Activo">Activo</option>
              <option value="Baja Provisional">Baja Provisional</option>
              <option value="Baja Definitiva">Baja Definitiva</option>
              <option value="Suspensión Temporal">Suspensión Temporal</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Condición SUNAT</label>
            <select
              value={empresa.condicion_sunat}
              onChange={(e) => setEmpresa({ ...empresa, condicion_sunat: e.target.value })}
              className={inputCls}
            >
              <option value="">Sin datos</option>
              <option value="Habido">Habido</option>
              <option value="No Habido">No Habido</option>
              <option value="No Hallado">No Hallado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className={labelCls}>Dirección Fiscal</label>
            <input
              type="text" value={empresa.direccion_fiscal}
              onChange={(e) => setEmpresa({ ...empresa, direccion_fiscal: e.target.value })}
              placeholder="Av. / Jr. / Calle..."
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Sitio Web</label>
            <input
              type="text" value={empresa.web}
              onChange={(e) => setEmpresa({ ...empresa, web: e.target.value })}
              placeholder="www.empresa.com"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Teléfono de la empresa</label>
            <input
              type="tel" value={empresa.telefono_empresa}
              onChange={(e) => setEmpresa({ ...empresa, telefono_empresa: e.target.value })}
              placeholder="01 234 5678"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Email corporativo</label>
            <input
              type="email" value={empresa.email_empresa}
              onChange={(e) => setEmpresa({ ...empresa, email_empresa: e.target.value })}
              placeholder="ventas@empresa.com"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Persona de contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Nombre completo <span className="text-red-500">*</span></label>
            <input
              required type="text" value={contacto.contact_name}
              onChange={(e) => setContacto({ ...contacto, contact_name: e.target.value })}
              placeholder="Nombre y apellidos"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Cargo en la empresa</label>
            <input
              type="text" value={contacto.contact_cargo}
              onChange={(e) => setContacto({ ...contacto, contact_cargo: e.target.value })}
              placeholder="Gerente de ventas"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>DNI / CE</label>
            <input
              type="text" maxLength={12} value={contacto.contact_dni}
              onChange={(e) => setContacto({ ...contacto, contact_dni: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Celular directo</label>
            <input
              type="tel" value={contacto.contact_phone}
              onChange={(e) => setContacto({ ...contacto, contact_phone: e.target.value })}
              placeholder="999 999 999"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>WhatsApp</label>
            <input
              type="tel" value={contacto.contact_whatsapp}
              onChange={(e) => setContacto({ ...contacto, contact_whatsapp: e.target.value })}
              placeholder="999 999 999"
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5 md:w-1/2">
          <label className={labelCls}>Email directo</label>
          <input
            type="email" value={contacto.contact_email}
            onChange={(e) => setContacto({ ...contacto, contact_email: e.target.value })}
            className={inputCls}
          />
        </div>
      </section>

      {/* DATOS DE PAGO */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Datos de pago <span className="text-slate-400 font-normal text-sm">(opcional)</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Banco</label>
            <select
              value={pago.banco}
              onChange={(e) => setPago({ ...pago, banco: e.target.value })}
              className={inputCls}
            >
              <option value="">Sin banco</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Tipo de cuenta</label>
            <select
              value={pago.tipo_cuenta}
              onChange={(e) => setPago({ ...pago, tipo_cuenta: e.target.value })}
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
              type="text" value={pago.numero_cuenta}
              onChange={(e) => setPago({ ...pago, numero_cuenta: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>CCI <span className="text-slate-400 text-xs">(20 dígitos)</span></label>
            <input
              type="text" maxLength={20} value={pago.cci}
              onChange={(e) => setPago({ ...pago, cci: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            id="is_active" type="checkbox"
            checked={is_active}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-input"
          />
          <label htmlFor="is_active" className={labelCls}>Proveedor activo</label>
        </div>
      )}

      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={loading} className="min-w-40">
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar proveedor'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
