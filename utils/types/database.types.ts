export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MovementType = 'entrada' | 'salida' | 'ajuste'
export type MovementReason = 
  | 'compra' 
  | 'produccion' 
  | 'merma' 
  | 'vencimiento'
  | 'ajuste_inventario'
  | 'devolucion_proveedor'
  | 'venta_manual'

export type EntityType = 'insumo' | 'producto'
export type CategoryType = 'insumo' | 'producto'
export type UnitType = 'peso' | 'volumen' | 'unidad'
export type UserRole = 'admin' | 'panadero' | 'cajero'
export type BatchStatus = 'disponible' | 'agotado' | 'vencido'
export type ProductionStatus = 'programada' | 'en_proceso' | 'completada' | 'cancelada'
export type ProductionOrderType = 'programada' | 'especial'
export type PurchaseOrderStatus = 'pendiente' | 'enviado' | 'recibido_completo' | 'recibido_parcial' | 'cancelado' | 'retrasado'
export type AlertType = 'stock_minimo' | 'vencimiento_proximo' | 'vencido' | 'produccion_pendiente'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type ComprobanteTipo = 'factura' | 'boleta' | 'ticket' | 'recibo'

// Interfaces principales
export interface Category {
  id: string
  name: string
  type: CategoryType
  description?: string
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  name: string
  symbol: string
  type: UnitType
  base_unit_id?: string
  conversion_factor?: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  business_name: string
  ruc?: string
  contact_name: string
  phone: string
  email?: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Supply {
  id: string
  code: string
  name: string
  category_id: string
  unit_id: string
  min_stock: number
  storage_conditions?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  unit?: Unit
}

export interface SupplyBatch {
  id: string
  supply_id: string
  supplier_id: string
  purchase_order_id?: string
  batch_code: string
  quantity_received: number
  unit_price: number
  total_cost: number
  manufacturing_date?: string
  expiration_date?: string
  received_date: string
  current_quantity: number
  status: BatchStatus
  created_by: string
  created_at: string
  updated_at: string
  // Relations
  supply?: Supply
  supplier?: Supplier
}

export interface Product {
  id: string
  code: string
  name: string
  category_id: string
  unit_id: string
  shelf_life_days: number
  selling_price?: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  unit?: Unit
}

export interface ProductRecipe {
  id: string
  product_id: string
  supply_id: string
  quantity: number
  unit_id: string
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  product?: Product
  supply?: Supply
  unit?: Unit
}

export interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  status: PurchaseOrderStatus
  subtotal: number
  tax: number
  total: number
  notes?: string
  // Documentos de recepción
  guia_remision?: string
  comprobante_tipo?: string
  comprobante_serie?: string
  comprobante_numero?: string
  comprobante_fecha?: string
  comprobante_monto?: number
  created_by: string
  created_at: string
  updated_at: string
  // Relations
  supplier?: Supplier
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  supply_id: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface InventoryMovement {
  id: string
  movement_type: MovementType
  movement_reason: MovementReason
  entity_type: EntityType
  entity_id: string
  batch_id?: string
  quantity: number
  unit_id: string
  unit_cost?: number
  total_cost?: number
  reference_type?: string
  reference_id?: string
  notes?: string
  movement_date: string
  created_by: string
  created_at: string
  // Relations
  unit?: Unit
}

export interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
