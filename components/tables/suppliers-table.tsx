'use client'

import { Supplier } from '@/utils/types/database.types'
import { Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SuppliersTableProps {
  suppliers: Supplier[]
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
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Razón Social
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              RUC
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Contacto
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Información
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Estado
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-4 px-4">
                <div className="font-medium text-slate-900">
                  {supplier.business_name}
                </div>
                {supplier.address && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    {supplier.address}
                  </div>
                )}
              </td>
              <td className="py-4 px-4">
                <span className="font-mono text-sm text-slate-600">
                  {supplier.ruc || '-'}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="text-sm font-medium text-slate-700">
                  {supplier.contact_name}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {supplier.phone}
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {supplier.email}
                    </div>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    supplier.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {supplier.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
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
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
