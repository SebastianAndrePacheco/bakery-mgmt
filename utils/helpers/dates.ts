/**
 * Formatea una fecha en formato DD/MM/YYYY
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Calcula días hasta una fecha
 */
export function daysUntil(date: string | Date): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  const diffTime = targetDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Verifica si una fecha está vencida
 */
export function isExpired(date: string | Date): boolean {
  return daysUntil(date) < 0
}

/**
 * Verifica si una fecha está próxima a vencer (dentro de N días)
 */
export function isExpiringSoon(date: string | Date, days: number = 7): boolean {
  const daysRemaining = daysUntil(date)
  return daysRemaining >= 0 && daysRemaining <= days
}

/**
 * Convierte fecha a formato YYYY-MM-DD para inputs
 */
export function toInputDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
