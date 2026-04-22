'use client'

import { Product, Category, Unit, TIPO_PRODUCTO_OPTIONS } from '@/utils/types/database.types'
import { Edit, Trash2, ShoppingBag, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency } from '@/utils/helpers/currency'

interface ProductWithRelations extends Product {
  category?: Category
  unit?: Unit
}

interface ProductsTableProps {
  products: ProductWithRelations[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">🍞</div>
        <p className="text-lg font-medium text-slate-700">No hay productos registrados</p>
        <p className="text-sm text-slate-500 mt-2">
          Comienza agregando tu primer producto terminado
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Código</th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Categoría</th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Unidad</th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">Vida Útil</th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">Precio</th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Estado</th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-4 px-4">
                <span className="font-mono text-sm text-slate-600">{product.code}</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-medium text-slate-900">{product.name}</div>
                    {(() => {
                      const tipo = TIPO_PRODUCTO_OPTIONS.find(t => t.value === product.tipo_producto)
                      return tipo ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${tipo.color}`}>
                          {tipo.label}
                        </span>
                      ) : null
                    })()}
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  {product.category?.name || '-'}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-slate-600">
                  {product.unit?.name} ({product.unit?.symbol})
                </span>
              </td>
              <td className="py-4 px-4 text-right">
                <span className="text-sm font-medium text-slate-700">{product.shelf_life_days} días</span>
              </td>
              <td className="py-4 px-4 text-right">
                {product.selling_price ? (
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(product.selling_price)}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">-</span>
                )}
              </td>
              <td className="py-4 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/produccion/productos/${product.id}/receta`}>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-purple-50 hover:text-purple-600"
                      title="Receta"
                    >
                      <ChefHat className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/produccion/productos/${product.id}`}>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
