'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Factory,
  FileText,
  ChevronDown,
  Users,
  ClipboardList,
  Box,
  History,
  ChefHat,
  ShoppingBag,
  Settings
} from 'lucide-react'
import { useState } from 'react'

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Compras',
    icon: ShoppingCart,
    children: [
      { title: 'Proveedores', icon: Users, href: '/compras/proveedores' },
      { title: 'Órdenes de Compra', icon: ClipboardList, href: '/compras/ordenes' },
    ],
  },
  {
    title: 'Inventario',
    icon: Package,
    children: [
      { title: 'Insumos', icon: Box, href: '/inventario/insumos' },
      { title: 'Productos Terminados', icon: ShoppingBag, href: '/inventario/productos-terminados' },
      { title: 'Kardex', icon: History, href: '/inventario/kardex' },
      { title: 'Ajustes', icon: Settings, href: '/inventario/ajustes' },
    ],
  },
  {
    title: 'Producción',
    icon: Factory,
    children: [
      { title: 'Productos', icon: ShoppingBag, href: '/produccion/productos' },
      { title: 'Órdenes', icon: ChefHat, href: '/produccion/ordenes' },
    ],
  },
  {
    title: 'Reportes',
    icon: FileText,
    href: '/reportes',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<string[]>(['Compras', 'Inventario', 'Producción'])

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white">Bakery Mgmt</h2>
        <p className="text-xs text-slate-400">Sistema de Gestión</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          if (item.children) {
            const isOpen = openSections.includes(item.title)
            const hasActiveChild = item.children.some(child => isActive(child.href))

            return (
              <div key={item.title}>
                <button
                  onClick={() => toggleSection(item.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    hasActiveChild
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-1 ml-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive(child.href)
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <child.icon className="w-4 h-4" />
                        <span className="text-sm">{child.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
