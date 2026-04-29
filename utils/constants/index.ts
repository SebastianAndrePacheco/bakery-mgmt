export const MOVEMENT_TYPES = {
  ENTRADA: 'entrada',
  SALIDA: 'salida',
  AJUSTE: 'ajuste',
} as const

export const MOVEMENT_REASONS = {
  COMPRA: 'compra',
  PRODUCCION: 'produccion',
  MERMA: 'merma',
  VENCIMIENTO: 'vencimiento',
  AJUSTE_INVENTARIO: 'ajuste_inventario',
  DEVOLUCION_PROVEEDOR: 'devolucion_proveedor',
  VENTA_MANUAL: 'venta_manual',
} as const

export const BATCH_STATUS = {
  DISPONIBLE: 'disponible',
  AGOTADO: 'agotado',
  VENCIDO: 'vencido',
} as const

export const PRODUCTION_STATUS = {
  PROGRAMADA: 'programada',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  CAJERO: 'cajero',
} as const

export const ALERT_TYPES = {
  STOCK_MINIMO: 'stock_minimo',
  VENCIMIENTO_PROXIMO: 'vencimiento_proximo',
  VENCIDO: 'vencido',
  PRODUCCION_PENDIENTE: 'produccion_pendiente',
} as const

// Configuraciones del sistema
export const SYSTEM_CONFIG = {
  DAYS_BEFORE_EXPIRATION_ALERT: 7, // Alertar 7 días antes del vencimiento
  MIN_STOCK_PERCENTAGE: 20, // Alertar cuando quede menos del 20% del stock mínimo
  DEFAULT_TAX_RATE: 0.18, // IGV 18% en Perú
  CURRENCY: 'PEN',
  CURRENCY_SYMBOL: 'S/',
} as const

// Unidades de medida predefinidas
export const DEFAULT_UNITS = [
  // Peso
  { name: 'Kilogramo', symbol: 'kg', type: 'peso' },
  { name: 'Gramo', symbol: 'g', type: 'peso', baseUnit: 'kg', conversionFactor: 0.001 },
  { name: 'Libra', symbol: 'lb', type: 'peso', baseUnit: 'kg', conversionFactor: 0.453592 },
  
  // Volumen
  { name: 'Litro', symbol: 'L', type: 'volumen' },
  { name: 'Mililitro', symbol: 'ml', type: 'volumen', baseUnit: 'L', conversionFactor: 0.001 },
  { name: 'Galón', symbol: 'gal', type: 'volumen', baseUnit: 'L', conversionFactor: 3.78541 },
  
  // Unidad
  { name: 'Unidad', symbol: 'und', type: 'unidad' },
  { name: 'Docena', symbol: 'doc', type: 'unidad', baseUnit: 'und', conversionFactor: 12 },
  { name: 'Caja', symbol: 'cja', type: 'unidad' },
] as const
