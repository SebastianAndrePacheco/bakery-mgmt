export interface SubModulo {
  key: string
  label: string
}

export interface ModuloConf {
  key: string
  label: string
  submodulos: SubModulo[]
}

export const ARBOL_MODULOS: ModuloConf[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    submodulos: [],
  },
  {
    key: 'compras',
    label: 'Compras',
    submodulos: [
      { key: 'compras.proveedores',     label: 'Proveedores' },
      { key: 'compras.ordenes',         label: 'Ver órdenes' },
      { key: 'compras.ordenes.crear',   label: 'Crear órdenes' },
      { key: 'compras.ordenes.recibir', label: 'Recibir mercadería' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    submodulos: [
      { key: 'inventario.insumos',    label: 'Insumos' },
      { key: 'inventario.ajustes',    label: 'Ajustes de stock' },
      { key: 'inventario.kardex',     label: 'Kardex' },
      { key: 'inventario.terminados', label: 'Productos terminados' },
    ],
  },
  {
    key: 'produccion',
    label: 'Producción',
    submodulos: [
      { key: 'produccion.productos',         label: 'Productos y recetas' },
      { key: 'produccion.ordenes',           label: 'Ver órdenes' },
      { key: 'produccion.ordenes.crear',     label: 'Crear órdenes' },
      { key: 'produccion.ordenes.completar', label: 'Completar órdenes' },
    ],
  },
  {
    key: 'reportes',
    label: 'Reportes',
    submodulos: [
      { key: 'reportes.compras',    label: 'Reportes de compras' },
      { key: 'reportes.inventario', label: 'Reportes de inventario' },
      { key: 'reportes.produccion', label: 'Reportes de producción' },
    ],
  },
]

// Modules configurable per cargo (excludes dashboard which is always-on)
export const MODULOS_CONFIGURABLES = ARBOL_MODULOS.filter(m => m.key !== 'dashboard')

// Admin-only modules — never stored in cargo_permisos
export const MODULOS_ADMIN: Record<string, string> = {
  empleados:    'Empleados',
  usuarios:     'Usuarios',
  configuracion:'Configuración',
  auditoria:    'Auditoría',
}

// All parent module keys (used by Sidebar to render nav items)
export const TODOS_LOS_MODULOS = [
  ...ARBOL_MODULOS.map(m => m.key),
  ...Object.keys(MODULOS_ADMIN),
]

// All leaf permission keys stored in cargo_permisos
export const TODOS_LOS_SUBMODULOS: string[] = ARBOL_MODULOS.flatMap(m =>
  m.submodulos.length > 0 ? m.submodulos.map(s => s.key) : [m.key]
)

/**
 * Returns true if the user's permission list includes the required key.
 * A more-specific permission implies its parents:
 * 'compras.ordenes.crear' → implies 'compras.ordenes' and 'compras'
 */
export function tienePermiso(permisos: string[], key: string): boolean {
  return permisos.includes(key) || permisos.some(p => p.startsWith(key + '.'))
}

/**
 * Derives which parent module keys are visible in the sidebar
 * from a list of sub-module permission strings.
 */
export function modulosVisibles(permisos: string[]): string[] {
  const visible = new Set<string>(['dashboard'])
  for (const p of permisos) {
    const parent = p.split('.')[0]
    if (parent) visible.add(parent)
  }
  return [...visible]
}
