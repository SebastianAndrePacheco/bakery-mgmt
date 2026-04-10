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
  return total / 1.18
}
