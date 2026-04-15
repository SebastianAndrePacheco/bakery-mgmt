'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Supplier, Supply, Unit } from '@/utils/types/database.types'
import { Plus, Trash2 } from 'lucide-react'
import { calculateSubtotalFromTotal, formatCurrency } from '@/utils/helpers/currency'
import { createPurchaseOrder } from '@/app/actions'
import { toast } from 'sonner'

interface SupplyWithUnit extends Supply {
  unit?: Unit
}

interface PurchaseOrderFormProps {
  suppliers: Supplier[]
  supplies: SupplyWithUnit[]
}

interface OrderItem {
  supply_id: string
  quantity: number
  unit_price: number  // Precio CON IGV incluido
  total: number       // Total CON IGV incluido
}

export function PurchaseOrderForm({ suppliers, supplies }: PurchaseOrderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
  })
  const [items, setItems] = useState<OrderItem[]>([
    { supply_id: '', quantity: 0, unit_price: 0, total: 0 }
  ])

  const addItem = () => {
    setItems([...items, { supply_id: '', quantity: 0, unit_price: 0, total: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof OrderItem, value: number | string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Calcular total del item (precio unitario ya incluye IGV)
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price
    }
    
    setItems(newItems)
  }

  const calculateTotalWithIGV = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validar que haya al menos un item con datos
      const validItems = items.filter(item => item.supply_id && item.quantity > 0)
      if (validItems.length === 0) {
        toast.error('Debe agregar al menos un insumo a la orden')
        setLoading(false)
        return
      }

      const totalWithIGV = calculateTotalWithIGV()
      const subtotal = calculateSubtotalFromTotal(totalWithIGV)
      const tax = totalWithIGV - subtotal

      const result = await createPurchaseOrder({
        supplier_id:            formData.supplier_id,
        order_date:             formData.order_date,
        expected_delivery_date: formData.expected_delivery_date,
        notes:                  formData.notes,
        subtotal,
        tax,
        total:                  totalWithIGV,
        items: validItems.map(item => ({
          supply_id:  item.supply_id,
          quantity:   item.quantity,
          unit_price: item.unit_price,
          total:      item.total,
        })),
      })

      if ('error' in result) {
        toast.error('Error al crear orden: ' + result.error)
        return
      }

      toast.success('Orden de compra creada correctamente')
      router.push('/compras/ordenes')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const totalWithIGV = calculateTotalWithIGV()
  const subtotal = calculateSubtotalFromTotal(totalWithIGV)
  const tax = totalWithIGV - subtotal

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="supplier_id" className="text-sm font-medium">
            Proveedor <span className="text-destructive">*</span>
          </label>
          <select
            id="supplier_id"
            required
            value={formData.supplier_id}
            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.business_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="order_date" className="text-sm font-medium">
            Fecha de Orden <span className="text-destructive">*</span>
          </label>
          <input
            id="order_date"
            type="date"
            required
            value={formData.order_date}
            onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="expected_delivery_date" className="text-sm font-medium">
            Fecha Esperada de Entrega
          </label>
          <input
            id="expected_delivery_date"
            type="date"
            value={formData.expected_delivery_date}
            onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notas
          </label>
          <input
            id="notes"
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas adicionales"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Items de la orden */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Insumos</h3>
          <Button type="button" onClick={addItem} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Insumo
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 rounded-lg">
              <div className="col-span-5 space-y-2">
                <label className="text-xs font-medium text-slate-600">
                  Insumo
                </label>
                <select
                  value={item.supply_id}
                  onChange={(e) => updateItem(index, 'supply_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar</option>
                  {supplies.map((supply) => (
                    <option key={supply.id} value={supply.id}>
                      {supply.name} ({supply.unit?.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-medium text-slate-600">
                  Cantidad
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-medium text-slate-600">
                  Precio Unit. (c/IGV)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={item.unit_price || ''}
                  onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-medium text-slate-600">
                  Total
                </label>
                <div className="px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-md">
                  {formatCurrency(item.total)}
                </div>
              </div>

              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-slate-50 p-6 rounded-lg space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal (sin IGV):</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">IGV (18%):</span>
          <span className="font-semibold">{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between text-lg border-t border-slate-200 pt-3">
          <span className="font-bold text-slate-900">Total a Pagar:</span>
          <span className="font-bold text-slate-900">{formatCurrency(totalWithIGV)}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Orden de Compra'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
