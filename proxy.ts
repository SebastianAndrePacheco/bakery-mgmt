import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que requieren al menos rol 'panadero' (cajero no puede acceder)
const PANADERO_ROUTES = [
  '/compras',
  '/inventario/insumos',
  '/inventario/kardex',
  '/inventario/ajustes',
  '/produccion',
]

// Rutas dentro de compras que solo admin puede acceder
const ADMIN_ONLY_ROUTES = [
  '/compras/proveedores',
  '/compras/ordenes/nueva',
  '/produccion/productos',
]

function matchesRoute(path: string, routes: string[]) {
  return routes.some(r => path === r || path.startsWith(r + '/'))
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

  // Con sesión en /auth → dashboard (solo navegación, no server actions)
  if (isGet && user && path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar rol en rutas protegidas
  if (user && (matchesRoute(path, PANADERO_ROUTES) || matchesRoute(path, ADMIN_ONLY_ROUTES))) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'cajero'

    // Cajero no puede acceder a rutas de panadero/admin
    if (role === 'cajero' && matchesRoute(path, PANADERO_ROUTES)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Panadero no puede acceder a rutas exclusivas de admin
    if (role === 'panadero' && matchesRoute(path, ADMIN_ONLY_ROUTES)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
