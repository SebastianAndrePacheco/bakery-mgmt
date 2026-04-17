// Validaciones de datos peruanos y comunes

export function validarDNI(v: string): string | null {
  if (!v) return null
  if (!/^\d{8}$/.test(v)) return 'El DNI debe tener exactamente 8 dígitos'
  return null
}

export function validarRUC(v: string): string | null {
  if (!v) return null
  if (!/^\d{11}$/.test(v)) return 'El RUC debe tener 11 dígitos'
  if (!['10', '20'].includes(v.slice(0, 2))) return 'El RUC debe empezar con 10 (persona natural) o 20 (empresa)'
  return null
}

export function validarCelular(v: string): string | null {
  if (!v) return null
  if (!/^9\d{8}$/.test(v)) return 'El celular debe tener 9 dígitos y empezar con 9'
  return null
}

export function validarEmail(v: string): string | null {
  if (!v) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Correo electrónico no válido'
  return null
}

export function validarCE(v: string): string | null {
  if (!v) return null
  if (v.length < 9 || v.length > 12) return 'El carné de extranjería debe tener entre 9 y 12 caracteres'
  return null
}
