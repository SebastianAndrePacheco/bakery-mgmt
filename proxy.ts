import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas exclusivas de admin (bloquean a cualquier no-admin, independiente del cargo)
const ADMIN_ONLY_ROUTES = [
  '/compras/proveedores',
  '/compras/ordenes/nueva',
  '/produccion/productos',
  '/empleados',
  '/usuarios',
  '/configuracion',
  '/auditoria',
]

// Módulo que corresponde a cada prefijo de ruta protegida (para verificar cargo_permisos)
const ROUTE_MODULE: { prefix: string; modulo: string }[] = [
  { prefix: '/compras',            modulo: 'compras'    },
  { prefix: '/inventario/insumos', modulo: 'inventario' },
  { prefix: '/inventario/kardex',  modulo: 'inventario' },
  { prefix: '/inventario/ajustes', modulo: 'inventario' },
  { prefix: '/inventario',         modulo: 'inventario' },
  { prefix: '/produccion',         modulo: 'produccion' },
  { prefix: '/reportes',           modulo: 'reportes'   },
]

function matchesRoute(path: string, routes: string[]) {
  return routes.some(r => path === r || path.startsWith(r + '/'))
}

function getModuloForPath(path: string): string | null {
  const match = ROUTE_MODULE.find(m => path === m.prefix || path.startsWith(m.prefix + '/'))
  return match?.modulo ?? null
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

  // Rutas exclusivas de admin: bloquear siempre para no-admin
  if (isAdminOnly) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Para rutas de módulo: verificar cargo_permisos
  if (modulo) {
    if (profile?.empleado_id) {
      const { data: empleado } = await supabase
        .from('empleados')
        .select('cargo_id')
        .eq('id', profile.empleado_id)
        .single()

      if (empleado?.cargo_id) {
        const { data: permiso } = await supabase
          .from('cargo_permisos')
          .select('modulo')
          .eq('cargo_id', empleado.cargo_id)
          .eq('modulo', modulo)
          .maybeSingle()

        if (permiso) return response
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
