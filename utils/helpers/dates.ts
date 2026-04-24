// Peru es UTC-5 fijo, sin horario de verano
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000

function toLimaDate(date: string | Date): Date {
  const utc = typeof date === 'string' ? new Date(date) : date
  return new Date(utc.getTime() - LIMA_OFFSET_MS)
}

/**
 * Fecha + hora en zona horaria Lima (UTC-5), formato DD/MM/YYYY HH:MM:SS
 */
export function formatDateTime(date: string | Date): string {
  const lima = toLimaDate(date)
  const d  = String(lima.getUTCDate()).padStart(2, '0')
  const m  = String(lima.getUTCMonth() + 1).padStart(2, '0')
  const y  = lima.getUTCFullYear()
  const h  = String(lima.getUTCHours()).padStart(2, '0')
  const mi = String(lima.getUTCMinutes()).padStart(2, '0')
  const s  = String(lima.getUTCSeconds()).padStart(2, '0')
  return `${d}/${m}/${y} ${h}:${mi}:${s}`
}

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
