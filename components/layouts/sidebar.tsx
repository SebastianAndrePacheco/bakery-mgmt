'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Factory,
  FileBarChart,
  Settings,
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Inventario',
    href: '/inventario',
    icon: Package,
    subItems: [
      { title: 'Insumos', href: '/inventario/insumos' },
      { title: 'Productos', href: '/inventario/productos' },
      { title: 'Kardex', href: '/inventario/kardex' },
    ]
  },
  {
    title: 'Compras',
    href: '/compras',
    icon: ShoppingCart,
    subItems: [
      { title: 'Órdenes de Compra', href: '/compras/ordenes' },
      { title: 'Proveedores', href: '/compras/proveedores' },
    ]
  },
  {
    title: 'Producción',
    href: '/produccion',
    icon: Factory,
    subItems: [
      { title: 'Órdenes de Producción', href: '/produccion/ordenes' },
      { title: 'Recetas', href: '/produccion/recetas' },
    ]
  },
  {
    title: 'Reportes',
    href: '/reportes',
    icon: FileBarChart
  },
  {
    title: 'Configuración',
    href: '/dashboard/configuracion',
    icon: Settings,
    subItems: [
      { title: 'Categorías', href: '/dashboard/configuracion/categorias' },
      { title: 'Unidades', href: '/dashboard/configuracion/unidades' },
      { title: 'Usuarios', href: '/dashboard/configuracion/usuarios' },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen p-4 flex flex-col">
      <div className="mb-8 pb-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
          🥖 Bakery
        </h1>
        <p className="text-sm text-slate-400 mt-1">Sistema de Gestión</p>
      </div>

      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isExpanded = expandedItems.includes(item.href) || isActive
          
          return (
            <div key={item.href}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.href)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-amber-500 text-slate-900 font-medium'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 pl-6 border-l-2 border-slate-700">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`block px-3 py-2 text-sm rounded-lg transition-all ${
                            pathname === subItem.href
                              ? 'bg-slate-800 text-amber-400 font-medium'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-900 font-medium'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      <div className="pt-4 border-t border-slate-700 text-xs text-slate-500">
        v1.0.0 - Bakery Mgmt
      </div>
    </aside>
  )
}
