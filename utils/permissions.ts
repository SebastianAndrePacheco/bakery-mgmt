// Módulos configurables por cargo (admin puede asignarlos a cualquier cargo)
export const MODULOS_CONFIGURABLES: Record<string, string> = {
  dashboard:   'Dashboard',
  compras:     'Compras',
  inventario:  'Inventario',
  produccion:  'Producción',
  reportes:    'Reportes',
}

// Módulos exclusivos de admin (no configurables via cargo)
export const MODULOS_ADMIN: Record<string, string> = {
  empleados:    'Empleados',
  usuarios:     'Usuarios',
  configuracion:'Configuración',
  auditoria:    'Auditoría',
}

export const TODOS_LOS_MODULOS = [
  ...Object.keys(MODULOS_CONFIGURABLES),
  ...Object.keys(MODULOS_ADMIN),
]
