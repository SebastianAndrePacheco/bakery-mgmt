'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Settings, AlertCircle } from 'lucide-react'

interface AdjustmentFormProps {
  supplies: any[]
  products: any[]
}

export function AdjustmentForm({ supplies, products }: AdjustmentFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    entity_type: 'insumo',
    entity_id: '',
    adjustment_type: 'salida',
    quantity: '',
    unit_price: '',
    reason: 'merma',
    notes: '',
    movement_date: new Date().toISOString().split('T')[0],
  })

  const selectedEntity = formData.entity_type === 'insumo'
    ? supplies.find(s => s.id === formData.entity_id)
    : products.find(p => p.id === formData.entity_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.entity_id) {
      alert('Por favor selecciona un ' + (formData.entity_type === 'insumo' ? 'insumo' : 'producto'))
      return
    }

    const quantity = parseFloat(formData.quantity)
    if (!quantity || quantity <= 0) {
      alert('La cantidad debe ser mayor a cero')
      return
    }

    const unitPrice = formData.adjustment_type === 'entrada' ? parseFloat(formData.unit_price) || 0 : 0

    const confirm = window.confirm(
      `⚠️ ¿Confirmar ajuste de inventario?\n\n` +
      `Tipo: ${formData.adjustment_type === 'entrada' ? 'POSITIVO (+)' : 'NEGATIVO (-)'}\n` +
      `${formData.entity_type === 'insumo' ? 'Insumo' : 'Producto'}: ${selectedEntity?.name}\n` +
      `Cantidad: ${quantity} ${selectedEntity?.unit?.symbol}\n` +
      (formData.adjustment_type === 'entrada' && unitPrice > 0 ? `Costo unitario: S/ ${unitPrice.toFixed(4)}\n` : '') +
      `Motivo: ${formData.reason}\n\n` +
      `Este movimiento se registrará en el kardex.`
    )

    if (!confirm) return

    setLoading(true)

    try {
      if (!selectedEntity?.unit_id) {
        throw new Error('No se pudo obtener la unidad del elemento seleccionado')
      }

      const { error } = await supabase.rpc('record_inventory_adjustment', {
        p_entity_type:     formData.entity_type,
        p_entity_id:       formData.entity_id,
        p_adjustment_type: formData.adjustment_type,
        p_quantity:        quantity,
        p_reason:          formData.reason,
        p_notes:           formData.notes,
        p_movement_date:   formData.movement_date,
        p_unit_id:         selectedEntity.unit_id,
        p_unit_price:      unitPrice,
      })

      if (error) throw error

      alert(
        `✅ Ajuste registrado exitosamente!\n\n` +
        `Tipo: ${formData.adjustment_type === 'entrada' ? 'Positivo' : 'Negativo'}\n` +
        `Cantidad: ${formData.adjustment_type === 'entrada' ? '+' : '-'}${quantity} ${selectedEntity?.unit?.symbol}`
      )

      router.push('/inventario/ajustes')

    } catch (error: any) {
      console.error('Error al registrar ajuste:', error)
      alert('❌ Error al registrar ajuste: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tipo de Artículo <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.entity_type}
            onChange={(e) => setFormData({ ...formData, entity_type: e.target.value, entity_id: '' })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="insumo">Insumo</option>
            <option value="producto">Producto Terminado</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {formData.entity_type === 'insumo' ? 'Insumo' : 'Producto'} <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.entity_id}
            onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar {formData.entity_type}</option>
            {formData.entity_type === 'insumo' ? (
              supplies.map((supply) => (
                <option key={supply.id} value={supply.id}>
                  {supply.code} - {supply.name}
                </option>
              ))
            ) : (
              products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} - {product.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tipo de Ajuste <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.adjustment_type}
            onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value, reason: e.target.value === 'entrada' ? 'correccion' : 'merma' })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="salida">Negativo (-) - Reducir stock</option>
            <option value="entrada">Positivo (+) - Aumentar stock</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Cantidad <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              required
              step="0.001"
              min="0.001"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0.000"
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {selectedEntity && (
              <div className="px-3 py-2 bg-slate-100 rounded-md text-sm font-medium">
                {selectedEntity.unit?.symbol}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Motivo <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {formData.adjustment_type === 'entrada' ? (
              <>
                <option value="correccion">Corrección de Inventario</option>
                <option value="otro">Otro</option>
              </>
            ) : (
              <>
                <option value="merma">Merma / Deterioro</option>
                <option value="vencimiento">Vencimiento</option>
                <option value="correccion">Corrección de Inventario</option>
                <option value="robo">Robo / Pérdida</option>
                <option value="otro">Otro</option>
              </>
            )}
          </select>
        </div>

        {formData.adjustment_type === 'entrada' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Costo Unitario (S/)
              <span className="text-slate-400 text-xs font-normal ml-1">opcional</span>
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              placeholder="0.0000"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Fecha <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.movement_date}
            onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Observaciones</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Detalles adicionales del ajuste..."
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {formData.adjustment_type === 'salida' ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Ajuste Negativo</h3>
              <p className="text-sm text-red-700">
                Este ajuste reducirá el stock descontando de los lotes más antiguos (FIFO).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Ajuste Positivo</h3>
              <p className="text-sm text-green-700">
                Se creará un nuevo lote con la cantidad indicada. El costo unitario es opcional (0 si se omite).
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={loading} 
          className="flex-1"
        >
          <Settings className="w-4 h-4 mr-2" />
          {loading ? 'Registrando...' : 'Registrar Ajuste'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
