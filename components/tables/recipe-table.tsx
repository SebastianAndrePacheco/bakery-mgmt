'use client'

import { ProductRecipe, Supply, Unit } from '@/utils/types/database.types'
import { Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'

interface RecipeItemWithRelations extends ProductRecipe {
  supply?: Supply & { unit?: Unit }
  unit?: Unit
}

interface RecipeTableProps {
  recipeItems: RecipeItemWithRelations[]
  productId: string
  productUnit?: Unit
}

export function RecipeTable({ recipeItems, productId, productUnit }: RecipeTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (recipeId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ingrediente de la receta?')) {
      return
    }

    setDeleting(recipeId)
    try {
      const { error } = await supabase
        .from('product_recipes')
        .delete()
        .eq('id', recipeId)

      if (error) throw error

      router.refresh()
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  if (recipeItems.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-lg font-medium text-slate-700">No hay ingredientes en la receta</p>
        <p className="text-sm text-slate-500 mt-2">
          Agrega los insumos necesarios para producir este producto
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>Nota:</strong> Las cantidades están expresadas para producir <strong>1 {productUnit?.symbol}</strong> de producto terminado.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
                Código
              </th>
              <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
                Insumo
              </th>
              <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
                Cantidad
              </th>
              <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">
                Notas
              </th>
              <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recipeItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-mono text-sm text-slate-600">
                    {item.supply?.code}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <div className="font-medium text-slate-900">
                      {item.supply?.name}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-lg font-bold text-purple-600">
                    {item.quantity}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">
                    {item.unit?.symbol}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-600">
                    {item.notes || '-'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
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
    </div>
  )
}
