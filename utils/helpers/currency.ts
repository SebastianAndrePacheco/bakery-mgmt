/**
 * Formatea un número como moneda peruana (PEN)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calcula el IGV (18%) de un monto
 */
export function calculateIGV(subtotal: number): number {
  return subtotal * 0.18
}

/**
 * Calcula el total incluyendo IGV
 */
export function calculateTotal(subtotal: number): number {
  return subtotal + calculateIGV(subtotal)
}

/**
 * Calcula el subtotal a partir de un total con IGV
 */
export function calculateSubtotalFromTotal(total: number): number {
  return round2(total / 1.18)
}

/**
 * Redondea a 2 decimales (evita artefactos de punto flotante en monedas)
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Multiplica cantidad × precio y redondea a 6 decimales
 * para eliminar el "tail" de punto flotante (e.g. 0.020000000000000004 → 0.02)
 */
export function multiplyQtyPrice(qty: number, price: number): number {
  return Math.round(qty * price * 1_000_000) / 1_000_000
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD usando la hora LOCAL
 * (evita el desfase de un día por UTC en zonas como Peru UTC-5)
 */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parsea una fecha YYYY-MM-DD sin desfase de zona horaria
 * Úsalo en lugar de new Date("2026-04-16") para display
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}
