'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmpresaConfig } from '@/utils/types/database.types'
import { upsertEmpresaConfig } from '@/app/actions'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'

interface EmpresaConfigFormProps {
  config?: EmpresaConfig
}

export function EmpresaConfigForm({ config }: EmpresaConfigFormProps) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [formData, setFormData] = useState({
    razon_social:     config?.razon_social     ?? '',
    nombre_comercial: config?.nombre_comercial ?? '',
    ruc:              config?.ruc              ?? '',
    direccion_fiscal: config?.direccion_fiscal ?? '',
    telefono:         config?.telefono         ?? '',
    email:            config?.email            ?? '',
    web:              config?.web              ?? '',
    igv:              config?.igv?.toString()  ?? '18',
    moneda:           config?.moneda           ?? 'PEN',
    logo_url:         config?.logo_url         ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaved(false)

    const result = await upsertEmpresaConfig({
      ...formData,
      igv: parseFloat(formData.igv) || 18,
    })

    setLoading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    setSaved(true)
    toast.success('Configuración guardada')
    setTimeout(() => setSaved(false), 3000)
  }

  const inputCls = 'w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm'
  const labelCls = 'text-sm font-medium'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* IDENTIFICACIÓN LEGAL */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Identificación legal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Razón Social <span className="text-red-500">*</span></label>
            <input
              required type="text" value={formData.razon_social}
              onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
              placeholder="Panificadora Ofelia E.I.R.L."
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Nombre Comercial</label>
            <input
              type="text" value={formData.nombre_comercial}
              onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
              placeholder="Panadería Ofelia"
              className={inputCls}
            />
          </div>
        </div>

        <div className="md:w-1/2 space-y-1.5">
          <label className={labelCls}>RUC <span className="text-slate-400 text-xs">(11 dígitos)</span></label>
          <input
            type="text" maxLength={11} value={formData.ruc}
            onChange={(e) => setFormData({ ...formData, ruc: e.target.value.replace(/\D/g, '') })}
            placeholder="20452630371"
            className={inputCls}
          />
        </div>
      </section>

      {/* CONTACTO Y UBICACIÓN */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Contacto y ubicación</h3>
        <div className="space-y-1.5">
          <label className={labelCls}>Dirección Fiscal</label>
          <input
            type="text" value={formData.direccion_fiscal}
            onChange={(e) => setFormData({ ...formData, direccion_fiscal: e.target.value })}
            placeholder="Av. / Jr. / Calle, número, distrito, provincia"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Teléfono</label>
            <input
              type="tel" value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="01 234 5678"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Email</label>
            <input
              type="email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contacto@panaderia.com"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Sitio Web</label>
            <input
              type="text" value={formData.web}
              onChange={(e) => setFormData({ ...formData, web: e.target.value })}
              placeholder="www.panaderia.com"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* CONFIGURACIÓN FISCAL */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Configuración fiscal</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>IGV (%) <span className="text-red-500">*</span></label>
            <input
              required type="number" step="0.01" min="0" max="100"
              value={formData.igv}
              onChange={(e) => setFormData({ ...formData, igv: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Moneda <span className="text-red-500">*</span></label>
            <select
              required value={formData.moneda}
              onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
              className={inputCls}
            >
              <option value="PEN">Soles (PEN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          El IGV se usa para calcular el desglose de comprobantes. Perú = 18%.
        </p>
      </section>

      {/* LOGO URL */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Logo <span className="text-slate-400 font-normal text-sm">(opcional)</span></h3>
        <div className="space-y-1.5">
          <label className={labelCls}>URL del logo</label>
          <input
            type="url" value={formData.logo_url}
            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            placeholder="https://..."
            className={inputCls}
          />
          <p className="text-xs text-slate-500">Sube el logo a Supabase Storage y pega la URL pública aquí.</p>
        </div>
        {formData.logo_url && (
          <div className="w-32 h-32 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={formData.logo_url}
              alt="Logo de la empresa"
              className="max-w-full max-h-full object-contain p-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}
      </section>

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" disabled={loading} className="min-w-44">
          {loading ? 'Guardando...' : 'Guardar configuración'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Guardado
          </span>
        )}
      </div>
    </form>
  )
}
