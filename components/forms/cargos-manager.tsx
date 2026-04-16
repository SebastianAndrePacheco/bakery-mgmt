'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Cargo } from '@/utils/types/database.types'
import { createCargo, updateCargo, toggleCargoStatus } from '@/app/actions'
import { toast } from 'sonner'
import { Plus, Pencil, Check, X, Power } from 'lucide-react'

interface CargosManagerProps {
  cargos: Cargo[]
}

export function CargosManager({ cargos }: CargosManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  // Nuevo cargo
  const [showNew, setShowNew] = useState(false)
  const [newData, setNewData] = useState({ nombre: '', descripcion: '' })

  // Edición inline
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ nombre: '', descripcion: '' })

  const handleCreate = async () => {
    if (!newData.nombre.trim()) return
    setLoading('new')
    const result = await createCargo({ ...newData, is_active: true })
    setLoading(null)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Cargo creado')
    setShowNew(false)
    setNewData({ nombre: '', descripcion: '' })
    router.refresh()
  }

  const handleUpdate = async (id: string) => {
    if (!editData.nombre.trim()) return
    setLoading(id)
    const cargo = cargos.find(c => c.id === id)!
    const result = await updateCargo(id, { ...editData, is_active: cargo.is_active })
    setLoading(null)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Cargo actualizado')
    setEditId(null)
    router.refresh()
  }

  const handleToggle = async (id: string, current: boolean) => {
    setLoading(id + '-toggle')
    const result = await toggleCargoStatus(id, !current)
    setLoading(null)
    if ('error' in result) { toast.error(result.error); return }
    toast.success(current ? 'Cargo desactivado' : 'Cargo activado')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Cargo</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Descripción</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cargos.map((cargo) => (
              <tr key={cargo.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  {editId === cargo.id ? (
                    <input
                      autoFocus
                      value={editData.nombre}
                      onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                      className="w-full px-2 py-1 border border-input rounded-md text-sm"
                    />
                  ) : (
                    <span className="font-medium">{cargo.nombre}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {editId === cargo.id ? (
                    <input
                      value={editData.descripcion}
                      onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                      placeholder="Descripción opcional"
                      className="w-full px-2 py-1 border border-input rounded-md text-sm"
                    />
                  ) : (
                    cargo.descripcion ?? '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    cargo.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {cargo.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {editId === cargo.id ? (
                      <>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 hover:bg-green-50 hover:text-green-600"
                          disabled={loading === cargo.id}
                          onClick={() => handleUpdate(cargo.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditId(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditId(cargo.id)
                            setEditData({ nombre: cargo.nombre, descripcion: cargo.descripcion ?? '' })
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className={`h-7 w-7 ${cargo.is_active ? 'hover:text-red-600' : 'hover:text-green-600'}`}
                          disabled={loading === cargo.id + '-toggle'}
                          onClick={() => handleToggle(cargo.id, cargo.is_active)}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {/* Fila nuevo cargo */}
            {showNew && (
              <tr className="bg-blue-50">
                <td className="px-4 py-3">
                  <input
                    autoFocus
                    value={newData.nombre}
                    onChange={(e) => setNewData({ ...newData, nombre: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Nombre del cargo"
                    className="w-full px-2 py-1 border border-blue-300 rounded-md text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={newData.descripcion}
                    onChange={(e) => setNewData({ ...newData, descripcion: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Descripción opcional"
                    className="w-full px-2 py-1 border border-blue-300 rounded-md text-sm"
                  />
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 hover:bg-green-50 hover:text-green-600"
                      disabled={loading === 'new'}
                      onClick={handleCreate}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7"
                      onClick={() => { setShowNew(false); setNewData({ nombre: '', descripcion: '' }) }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {cargos.length === 0 && !showNew && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No hay cargos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!showNew && (
        <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cargo
        </Button>
      )}
    </div>
  )
}
