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
