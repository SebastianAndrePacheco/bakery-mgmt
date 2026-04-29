import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas exclusivas de admin (nunca configurables por cargo)
const ADMIN_ONLY_ROUTES = [
  '/empleados',
  '/usuarios',
  '/configuracion',
  '/auditoria',
]

// Ruta → sub-módulo requerido. El orden importa: más específico primero.
const ROUTE_MODULE: { prefix: string; modulo: string }[] = [
  { prefix: '/compras/proveedores',             modulo: 'compras.proveedores' },
  { prefix: '/compras/ordenes/nueva',           modulo: 'compras.ordenes.crear' },
  { prefix: '/compras/ordenes',                 modulo: 'compras.ordenes' },
  { prefix: '/compras',                         modulo: 'compras' },
  { prefix: '/inventario/insumos',              modulo: 'inventario.insumos' },
  { prefix: '/inventario/ajustes',              modulo: 'inventario.ajustes' },
  { prefix: '/inventario/kardex',               modulo: 'inventario.kardex' },
  { prefix: '/inventario/productos-terminados', modulo: 'inventario.terminados' },
  { prefix: '/inventario',                      modulo: 'inventario' },
  { prefix: '/produccion/productos',            modulo: 'produccion.productos' },
  { prefix: '/produccion/ordenes/nueva',        modulo: 'produccion.ordenes.crear' },
  { prefix: '/produccion/ordenes',              modulo: 'produccion.ordenes' },
  { prefix: '/produccion',                      modulo: 'produccion' },
  { prefix: '/reportes/compras-proveedor',      modulo: 'reportes.compras' },
  { prefix: '/reportes/proveedores-categoria',  modulo: 'reportes.compras' },
  { prefix: '/reportes/consumo-insumos',        modulo: 'reportes.inventario' },
  { prefix: '/reportes/inventario-valorizado',  modulo: 'reportes.inventario' },
  { prefix: '/reportes/mermas',                 modulo: 'reportes.inventario' },
  { prefix: '/reportes/vencimientos',           modulo: 'reportes.inventario' },
  { prefix: '/reportes/proyeccion-inventario',  modulo: 'reportes.inventario' },
  { prefix: '/reportes/costos-produccion',      modulo: 'reportes.produccion' },
  { prefix: '/reportes',                        modulo: 'reportes' },
]

function matchesRoute(path: string, routes: string[]) {
  return routes.some(r => path === r || path.startsWith(r + '/'))
}

function getModuloForPath(path: string): string | null {
  const match = ROUTE_MODULE.find(m => path === m.prefix || path.startsWith(m.prefix + '/'))
  return match?.modulo ?? null
}

// A more-specific permission implies its parents:
// 'compras.ordenes.crear' → satisfies 'compras.ordenes' and 'compras'
function hasPermiso(permisos: string[], key: string): boolean {
  return permisos.includes(key) || permisos.some(p => p.startsWith(key + '.'))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isGet = request.method === 'GET'

  // Sin sesión → login (solo navegación, no server actions)
  if (isGet && !user && !path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Con sesión en /auth → dashboard (excepto nueva-clave que necesita sesión activa)
  if (isGet && user && path.startsWith('/auth') && path !== '/auth/nueva-clave') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar permisos en rutas protegidas (solo navegación GET)
  if (!isGet || !user) return response

  const isAdminOnly = matchesRoute(path, ADMIN_ONLY_ROUTES)
  const modulo = getModuloForPath(path)

  if (!isAdminOnly && !modulo) return response

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, empleado_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'cajero'

  // Admin tiene acceso total
  if (role === 'admin') return response

  // Rutas exclusivas de admin
  if (isAdminOnly) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar cargo_permisos con sub-módulo
  if (modulo) {
    if (profile?.empleado_id) {
      const { data: empleado } = await supabase
        .from('empleados')
        .select('cargo_id')
        .eq('id', profile.empleado_id)
        .single()

      if (empleado?.cargo_id) {
        const { data: permisos } = await supabase
          .from('cargo_permisos')
          .select('modulo')
          .eq('cargo_id', empleado.cargo_id)

        const list = (permisos ?? []).map(p => p.modulo)
        if (hasPermiso(list, modulo)) return response
      }
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
