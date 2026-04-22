'use client'

import { Supply, Category, Unit, TIPO_INSUMO_OPTIONS } from '@/utils/types/database.types'
import { Edit, Trash2, Package, AlertCircle, TrendingUp, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SupplyWithRelations extends Supply {
  category?: Category
  unit?: Unit
  current_stock?: number
}

interface SuppliesTableProps {
  supplies: SupplyWithRelations[]
}

export function SuppliesTable({ supplies }: SuppliesTableProps) {
  if (supplies.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">📦</div>
        <p className="text-lg font-medium text-slate-700">No hay insumos registrados</p>
        <p className="text-sm text-slate-500 mt-2">
          Comienza agregando tu primer insumo
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
              Código
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Nombre
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
              Categoría
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Stock Actual
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
              Stock Mínimo
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
          {supplies.map((supply) => {
            const stockPercentage = supply.current_stock && supply.min_stock 
              ? (supply.current_stock / supply.min_stock) * 100
              : 0
            
            const isLowStock = supply.current_stock !== undefined && supply.current_stock < supply.min_stock
            const isCriticalStock = supply.current_stock !== undefined && supply.current_stock < (supply.min_stock * 0.5)

            return (
              <tr key={supply.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-mono text-sm text-slate-600">
                    {supply.code}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-900">
                        {supply.name}
                      </div>
                      {(() => {
                        const tipo = TIPO_INSUMO_OPTIONS.find(t => t.value === supply.tipo_insumo)
                        return tipo ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${tipo.color}`}>
                            {tipo.label}
                          </span>
                        ) : null
                      })()}
                      {supply.storage_conditions && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {supply.storage_conditions}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {supply.category?.name || '-'}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isCriticalStock && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {isLowStock && !isCriticalStock && (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <Link href={`/inventario/insumos/${supply.id}/lotes`}>
                      <span className={`text-lg font-bold hover:underline cursor-pointer ${
                        isCriticalStock 
                          ? 'text-red-600' 
                          : isLowStock 
                          ? 'text-amber-600' 
                          : 'text-green-600'
                      }`}>
                        {supply.current_stock?.toFixed(2) || '0.00'}
                      </span>
                    </Link>
                    <span className="text-sm text-slate-500">
                      {supply.unit?.symbol}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {supply.min_stock} {supply.unit?.symbol}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        supply.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {supply.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    {isCriticalStock && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Stock Crítico
                      </span>
                    )}
                    {isLowStock && !isCriticalStock && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        Stock Bajo
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/inventario/insumos/${supply.id}/lotes`}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="hover:bg-purple-50 hover:text-purple-600"
                        title="Ver lotes"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/inventario/insumos/${supply.id}`}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="hover:bg-blue-50 hover:text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-red-50 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
