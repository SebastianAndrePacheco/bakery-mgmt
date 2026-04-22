export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TipoInsumo =
  | 'harina_almidon'
  | 'lacteo'
  | 'huevo'
  | 'grasa_aceite'
  | 'azucar_endulzante'
  | 'levadura_fermento'
  | 'sal_condimento'
  | 'aditivo_mejorador'
  | 'relleno_cobertura'
  | 'fruta_semilla_fruto_seco'
  | 'colorante_saborizante'
  | 'agua_liquido'
  | 'envase_empaque'
  | 'limpieza_higiene'
  | 'combustible'
  | 'otro'

export type TipoProducto =
  | 'pan_sal'
  | 'pan_dulce'
  | 'pan_integral'
  | 'torta_pastel'
  | 'bizcocho_queque'
  | 'galleta'
  | 'empanada_salado'
  | 'hojaldre'
  | 'dona_berlin'
  | 'paneton'
  | 'postre'
  | 'otro'

export const TIPO_PRODUCTO_OPTIONS: { value: TipoProducto; label: string; color: string }[] = [
  { value: 'pan_sal',         label: 'Pan de sal',                  color: 'bg-amber-100 text-amber-800' },
  { value: 'pan_dulce',       label: 'Pan dulce',                   color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pan_integral',    label: 'Pan integral y cereales',     color: 'bg-lime-100 text-lime-800' },
  { value: 'torta_pastel',    label: 'Tortas y pasteles',           color: 'bg-pink-100 text-pink-800' },
  { value: 'bizcocho_queque', label: 'Bizcochos y queques',         color: 'bg-orange-100 text-orange-800' },
  { value: 'galleta',         label: 'Galletas',                    color: 'bg-rose-100 text-rose-800' },
  { value: 'empanada_salado', label: 'Empanadas y salados',         color: 'bg-teal-100 text-teal-800' },
  { value: 'hojaldre',        label: 'Hojaldres y croissants',      color: 'bg-sky-100 text-sky-800' },
  { value: 'dona_berlin',     label: 'Donas y berlines',            color: 'bg-violet-100 text-violet-800' },
  { value: 'paneton',         label: 'Panetón',                     color: 'bg-red-100 text-red-800' },
  { value: 'postre',          label: 'Postres y dulces',            color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'otro',            label: 'Otro',                        color: 'bg-slate-100 text-slate-600' },
]

export const TIPO_INSUMO_OPTIONS: { value: TipoInsumo; label: string; color: string }[] = [
  { value: 'harina_almidon',           label: 'Harinas y almidones',          color: 'bg-yellow-100 text-yellow-800' },
  { value: 'lacteo',                   label: 'Lácteos',                       color: 'bg-sky-100 text-sky-800' },
  { value: 'huevo',                    label: 'Huevos y derivados',            color: 'bg-orange-100 text-orange-800' },
  { value: 'grasa_aceite',             label: 'Grasas y aceites',             color: 'bg-amber-100 text-amber-800' },
  { value: 'azucar_endulzante',        label: 'Azúcares y endulzantes',       color: 'bg-pink-100 text-pink-800' },
  { value: 'levadura_fermento',        label: 'Levaduras y fermentos',        color: 'bg-lime-100 text-lime-800' },
  { value: 'sal_condimento',           label: 'Sal y condimentos',            color: 'bg-slate-100 text-slate-700' },
  { value: 'aditivo_mejorador',        label: 'Aditivos y mejoradores',       color: 'bg-violet-100 text-violet-800' },
  { value: 'relleno_cobertura',        label: 'Rellenos y coberturas',        color: 'bg-rose-100 text-rose-800' },
  { value: 'fruta_semilla_fruto_seco', label: 'Frutas, semillas y frutos secos', color: 'bg-green-100 text-green-800' },
  { value: 'colorante_saborizante',    label: 'Colorantes y saborizantes',    color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'agua_liquido',             label: 'Agua y líquidos',              color: 'bg-cyan-100 text-cyan-800' },
  { value: 'envase_empaque',           label: 'Envases y empaques',           color: 'bg-teal-100 text-teal-800' },
  { value: 'limpieza_higiene',         label: 'Limpieza e higiene',           color: 'bg-indigo-100 text-indigo-800' },
  { value: 'combustible',              label: 'Combustibles',                 color: 'bg-red-100 text-red-800' },
  { value: 'otro',                     label: 'Otro',                         color: 'bg-slate-100 text-slate-600' },
]

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
export type PurchaseOrderStatus = 'borrador' | 'pendiente_aprobacion' | 'aprobado' | 'rechazado' | 'pendiente' | 'enviado' | 'recibido_completo' | 'recibido_parcial' | 'cancelado' | 'retrasado'

export interface PurchaseOrderApproval {
  id: string
  purchase_order_id: string
  action: 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'sent'
  comment?: string
  created_by?: string
  created_at: string
}
export type AlertType = 'stock_minimo' | 'vencimiento_proximo' | 'vencido' | 'produccion_pendiente'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type ComprobanteTipo = 'factura' | 'boleta' | 'ticket' | 'recibo'
export type TipoDocumento   = 'DNI' | 'CE' | 'Pasaporte'
export type GeneroTipo      = 'M' | 'F' | 'Otro'
export type TipoContrato    = 'indefinido' | 'plazo_fijo' | 'part_time' | 'recibo_honorarios'
export type TipoCuentaBanco = 'ahorros' | 'corriente'

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
  // Empresa
  nombre_comercial?: string
  tipo_proveedor?: string
  estado_sunat?: string
  condicion_sunat?: string
  direccion_fiscal?: string
  telefono_empresa?: string
  email_empresa?: string
  web?: string
  // Contacto (campos legacy conservados + nuevos separados)
  contact_name: string
  phone: string
  email?: string
  address?: string
  contact_cargo?: string
  contact_dni?: string
  contact_phone?: string
  contact_email?: string
  contact_whatsapp?: string
  categoria_suministro?: string
  // Pago
  banco?: string
  tipo_cuenta?: TipoCuentaBanco
  numero_cuenta?: string
  cci?: string
  moneda?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Cargo {
  id: string
  nombre: string
  descripcion?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Persona {
  id: string
  tipo_doc: TipoDocumento
  numero_doc: string
  nombres: string
  apellido_paterno: string
  apellido_materno?: string
  fecha_nacimiento?: string
  genero?: GeneroTipo
  telefono?: string
  email?: string
  direccion?: string
  foto_url?: string
  created_at: string
  updated_at: string
}

export interface Empleado {
  id: string
  persona_id: string
  cargo_id: string
  user_id?: string
  fecha_ingreso: string
  fecha_cese?: string
  tipo_contrato: TipoContrato
  sueldo_base?: number
  banco?: string
  tipo_cuenta?: TipoCuentaBanco
  numero_cuenta?: string
  cci?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  persona?: Persona
  cargo?: Cargo
}

export interface Supply {
  id: string
  code: string
  name: string
  category_id: string
  unit_id: string
  tipo_insumo: TipoInsumo
  min_stock: number
  storage_conditions?: string
  tasa_igv: number
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
  tipo_producto: TipoProducto
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

export interface EmpresaConfig {
  id: string
  razon_social: string
  nombre_comercial?: string
  ruc?: string
  direccion_fiscal?: string
  telefono?: string
  email?: string
  web?: string
  igv: number
  moneda: string
  logo_url?: string
  updated_at: string
}

export interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  phone?: string
  empleado_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  empleado?: Empleado
}
