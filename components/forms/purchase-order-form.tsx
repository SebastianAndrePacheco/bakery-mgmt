'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Supplier, Supply, Unit, SupplierCatalogEntry } from '@/utils/types/database.types'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency, localDateString, round2 } from '@/utils/helpers/currency'
import { createPurchaseOrder } from '@/app/actions'
import { toast } from 'sonner'

interface SupplyWithUnit extends Supply {
  unit?: Unit
}

interface PurchaseOrderFormProps {
  suppliers: Supplier[]
  supplies: SupplyWithUnit[]
  catalog: SupplierCatalogEntry[]
}

interface OrderItem {
  supply_id: string
  package_quantity: number   // lo que ingresa el usuario (cajas, sacos, etc.)
  purchase_unit: string      // "Caja" del catálogo, o símbolo de unidad si no hay catálogo
  units_per_package: number  // 12 para cajas de 12 L; 1 si no hay catálogo
  quantity: number           // stock units = package_quantity × units_per_package
  unit_price: number         // total / quantity  (por unidad de stock, para costeo)
  total: number              // precio del ítem sin IGV (lo ingresa el usuario)
}

export function PurchaseOrderForm({ suppliers, supplies, catalog }: PurchaseOrderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: localDateString(),
    expected_delivery_date: '',
    notes: '',
  })
  const [items, setItems] = useState<OrderItem[]>([
    { supply_id: '', package_quantity: 0, purchase_unit: '', units_per_package: 1, quantity: 0, unit_price: 0, total: 0 }
  ])

  // Entradas del catálogo para el proveedor seleccionado
  const supplierCatalog = catalog.filter(e => e.supplier_id === formData.supplier_id)

  const catalogEntry = (supplyId: string) =>
    supplierCatalog.find(e => e.supply_id === supplyId)

  const addItem = () => {
    setItems([...items, {
      supply_id: '', package_quantity: 0, purchase_unit: '',
      units_per_package: 1, quantity: 0, unit_price: 0, total: 0
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (
    index: number,
    field: 'supply_id' | 'package_quantity' | 'total',
    value: number | string
  ) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value }

    // Cuando cambia el insumo: actualiza unidad de empaque desde el catálogo
    if (field === 'supply_id') {
      const supply = supplies.find(s => s.id === value)
      const entry = catalog.find(e => e.supplier_id === formData.supplier_id && e.supply_id === value)
      item.purchase_unit     = entry ? entry.purchase_unit : (supply?.unit?.symbol ?? '')
      item.units_per_package = entry ? entry.units_per_package : 1
      item.total             = entry?.default_price ?? 0
      item.package_quantity  = 0
      item.quantity          = 0
      item.unit_price        = 0
    }

    // Recalcular quantity y unit_price
    const qty   = item.package_quantity * item.units_per_package
    item.quantity   = qty
    item.unit_price = qty > 0 ? Math.round((item.total / qty) * 1_000_000) / 1_000_000 : 0

    newItems[index] = item
    setItems(newItems)
  }

  // Cuando cambia proveedor: limpiar datos de empaque de los ítems
  const handleSupplierChange = (supplierId: string) => {
    setFormData({ ...formData, supplier_id: supplierId })
    setItems(prev => prev.map(item => {
      if (!item.supply_id) return item
      const entry = catalog.find(e => e.supplier_id === supplierId && e.supply_id === item.supply_id)
      const supply = supplies.find(s => s.id === item.supply_id)
      const newPurchaseUnit     = entry ? entry.purchase_unit : (supply?.unit?.symbol ?? '')
      const newUnitsPerPackage  = entry ? entry.units_per_package : 1
      const newQuantity         = item.package_quantity * newUnitsPerPackage
      const newUnitPrice        = newQuantity > 0 ? Math.round((item.total / newQuantity) * 1_000_000) / 1_000_000 : 0
      return {
        ...item,
        purchase_unit: newPurchaseUnit,
        units_per_package: newUnitsPerPackage,
        quantity: newQuantity,
        unit_price: newUnitPrice,
      }
    }))
  }

  const calculateTotals = () => {
    let subtotal = 0
    let tax = 0
    for (const item of items) {
      subtotal += item.total
      const tasa = supplies.find(s => s.id === item.supply_id)?.tasa_igv ?? 18
      tax += round2(item.total * (tasa / 100))
    }
    return { subtotal: round2(subtotal), tax: round2(tax), total: round2(subtotal + tax) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const validItems = items.filter(item => item.supply_id && item.package_quantity > 0)
      if (validItems.length === 0) {
        toast.error('Debe agregar al menos un insumo con cantidad mayor a 0')
        setLoading(false)
        return
      }

      const { subtotal, tax, total: totalWithIGV } = calculateTotals()

      const result = await createPurchaseOrder({
        supplier_id:            formData.supplier_id,
        order_date:             formData.order_date,
        expected_delivery_date: formData.expected_delivery_date,
        notes:                  formData.notes,
        subtotal,
        tax,
        total: totalWithIGV,
        items: validItems.map(item => ({
          supply_id:         item.supply_id,
          quantity:          item.quantity,
          unit_price:        item.unit_price,
          total:             item.total,
          package_quantity:  item.units_per_package > 1 ? item.package_quantity : undefined,
          purchase_unit:     item.units_per_package > 1 ? item.purchase_unit : undefined,
          units_per_package: item.units_per_package > 1 ? item.units_per_package : undefined,
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

  const { subtotal, tax, total: totalWithIGV } = calculateTotals()

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
            onChange={(e) => handleSupplierChange(e.target.value)}
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
            min={localDateString()}
            onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-slate-500">Solo fechas desde hoy en adelante</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">Notas</label>
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

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Insumos</h3>
          <Button type="button" onClick={addItem} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Insumo
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const supply    = supplies.find(s => s.id === item.supply_id)
            const entry     = catalogEntry(item.supply_id)
            const hasPackage = entry != null
            const stockQty  = item.package_quantity * item.units_per_package

            return (
              <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Insumo */}
                  <div className="col-span-5 space-y-2">
                    <label className="text-xs font-medium text-slate-600">Insumo</label>
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

                  {/* Cantidad */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-medium text-slate-600">
                      Cantidad{item.purchase_unit ? ` (${item.purchase_unit})` : ''}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.package_quantity || ''}
                      onChange={(e) => updateItem(index, 'package_quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {hasPackage && item.package_quantity > 0 && (
                      <p className="text-xs text-slate-400">
                        = {stockQty} {supply?.unit?.symbol}
                      </p>
                    )}
                  </div>

                  {/* Precio ítem */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-medium text-slate-600">
                      Precio ítem (sin IGV)
                      {(() => {
                        const tasa = supplies.find(s => s.id === item.supply_id)?.tasa_igv
                        if (tasa === undefined || !item.supply_id) return null
                        return <span className="ml-1 text-slate-400">[IGV {tasa}%]</span>
                      })()}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.total || ''}
                      onChange={(e) => updateItem(index, 'total', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {item.package_quantity > 0 && item.total > 0 && item.supply_id && (
                      <p className="text-xs text-slate-400">
                        = {formatCurrency(item.unit_price)} / {supply?.unit?.symbol ?? 'u'}
                      </p>
                    )}
                  </div>

                  {/* Total display */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-medium text-slate-600">Total</label>
                    <div className="px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-md">
                      {formatCurrency(item.total)}
                    </div>
                  </div>

                  {/* Eliminar */}
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

                {/* Badge de empaque */}
                {hasPackage && item.supply_id && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 w-fit">
                    Empaque: 1 {entry.purchase_unit} = {entry.units_per_package} {supply?.unit?.symbol}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-slate-50 p-6 rounded-lg space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal (sin IGV):</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">IGV:</span>
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
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
