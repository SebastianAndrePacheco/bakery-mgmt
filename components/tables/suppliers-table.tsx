'use client'

import { Supplier } from '@/utils/types/database.types'
import { Edit, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SuppliersTableProps {
  suppliers: Supplier[]
}

const TIPO_BADGE: Record<string, string> = {
  'persona_natural': 'bg-blue-100 text-blue-700',
  'persona_juridica': 'bg-purple-100 text-purple-700',
}

const TIPO_LABEL: Record<string, string> = {
  'persona_natural':  'Persona Natural',
  'persona_juridica': 'Persona Jurídica',
}

const SUNAT_BADGE: Record<string, string> = {
  'ACTIVO':   'bg-green-100 text-green-700',
  'BAJA':     'bg-red-100 text-red-700',
  'SUSPENDIDO': 'bg-yellow-100 text-yellow-700',
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  if (suppliers.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">📦</div>
        <p className="text-lg font-medium text-slate-700">No hay proveedores registrados</p>
        <p className="text-sm text-slate-500 mt-2">
          Comienza agregando tu primer proveedor
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Empresa</th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">RUC / SUNAT</th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Contacto</th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Estado</th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {suppliers.map((supplier) => {
            const contactName  = supplier.contact_name
            const contactCargo = supplier.contact_cargo
            const contactPhone = supplier.contact_phone || supplier.phone
            const contactEmail = supplier.contact_email || supplier.email

            return (
              <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                {/* Empresa */}
                <td className="py-4 px-4 max-w-xs">
                  <div className="font-medium text-slate-900 leading-tight">
                    {supplier.business_name}
                  </div>
                  {supplier.nombre_comercial && (
                    <div className="text-xs text-slate-500 mt-0.5">{supplier.nombre_comercial}</div>
                  )}
                  {supplier.tipo_proveedor && (
                    <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[supplier.tipo_proveedor] ?? 'bg-slate-100 text-slate-600'}`}>
                      {TIPO_LABEL[supplier.tipo_proveedor] ?? supplier.tipo_proveedor}
                    </span>
                  )}
                </td>

                {/* RUC / SUNAT */}
                <td className="py-4 px-4">
                  <span className="font-mono text-sm text-slate-700">
                    {supplier.ruc || <span className="text-slate-400 text-xs">Sin RUC</span>}
                  </span>
                  {supplier.estado_sunat && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SUNAT_BADGE[supplier.estado_sunat] ?? 'bg-slate-100 text-slate-600'}`}>
                        {supplier.estado_sunat}
                      </span>
                      {supplier.condicion_sunat && (
                        <span className="text-xs text-slate-500">{supplier.condicion_sunat}</span>
                      )}
                    </div>
                  )}
                </td>

                {/* Contacto */}
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-slate-700">{contactName}</div>
                  {contactCargo && (
                    <div className="text-xs text-slate-500">{contactCargo}</div>
                  )}
                  <div className="mt-1 space-y-0.5">
                    {contactPhone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {contactPhone}
                      </div>
                    )}
                    {contactEmail && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="w-3 h-3" />
                        {contactEmail}
                      </div>
                    )}
                  </div>
                </td>

                {/* Estado */}
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    supplier.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {supplier.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                {/* Acciones */}
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/compras/proveedores/${supplier.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
