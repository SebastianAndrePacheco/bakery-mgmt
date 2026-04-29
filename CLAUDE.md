# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test suite is configured.

## Architecture

**Bakery management system** for Panificadora Ofelia E.I.R.L. — Next.js 16 App Router + Supabase (PostgreSQL + Auth).

### Key modules (app router segments)

| Route prefix | Domain |
|---|---|
| `/auth` | Login, password reset, MFA |
| `/dashboard` | KPI overview |
| `/compras` | Purchase orders + suppliers |
| `/inventario` | Supplies, batches, kardex, adjustments |
| `/produccion` | Products, recipes, production orders |
| `/reportes` | Analytics & exports |
| `/empleados` | HR: personas, cargos |
| `/usuarios` | Auth user management (admin only) |
| `/configuracion` | Company config + role-based permissions |
| `/auditoria` | Audit log (admin only) |

All authenticated sections share the same shell layout (`SidebarWrapper` + `Header`) defined in each module's `layout.tsx`.

### Data flow

- **Server Actions** (`app/actions/index.ts`) — single file for all mutations. Pattern: Zod schema → validate → auth check → DB call → `revalidatePath`. Returns `ActionResult = { error: string } | { success: true }`.
- **Server Components** read directly from Supabase (no API layer). Client components receive data as props.
- **`supabaseAdmin`** (`utils/supabase/admin.ts`) — uses `SUPABASE_SERVICE_ROLE_KEY`, server-side only. Used for admin user management and password resets.
- Complex DB operations go through Supabase RPC functions (`create_purchase_order_with_items`, `receive_purchase_order`, `complete_production_order`, `record_inventory_adjustment`).

### Auth & permissions

- Auth is cookie-based via `@supabase/ssr`. Three clients: `lib/supabase.ts` (browser), `utils/supabase/server.ts` (server/actions), `utils/supabase/admin.ts` (service role).
- **`proxy.ts`** (root) is the Next.js middleware (must be named `middleware.ts` to activate — currently named `proxy.ts`). It handles: unauthenticated redirect to `/auth/login`, session routing, and route-level permission checks.
- Permission model: `admin` role has full access. Non-admin users need an `empleado` record with a `cargo`. Each cargo has module permissions stored in `cargo_permisos` (table). Configurable modules: `dashboard`, `compras`, `inventario`, `produccion`, `reportes`. Admin-only modules: `empleados`, `usuarios`, `configuracion`, `auditoria`.
- `SidebarWrapper` (server component) resolves which modules to show per user by querying `user_profiles → empleados → cargo_permisos`.

### DB schema conventions

- All PKs are UUID (`uuid_generate_v4()`).
- Timestamps: `created_at` / `updated_at` as `TIMESTAMPTZ`.
- Soft deletes via `is_active` boolean.
- Migration files at root (`migration-*.sql`). Schema source of truth: `supabase-schema.sql`.
- RLS policies: `supabase-rls-policies.sql`. RPC functions: `supabase-rpc-functions.sql`.

### Frontend conventions

- Tailwind CSS v4 — no `@apply`, utility classes only.
- Toast notifications via `sonner` (`toast.success` / `toast.error`).
- Dates: always use Lima timezone (UTC-5, no DST). Use helpers from `utils/helpers/dates.ts`. Do **not** rely on `Intl`/ICU for timezone conversion — use the manual offset in `toLimaDate()`.
- Currency: PEN (S/). Format with `utils/helpers/currency.ts`.
- Type definitions for all DB entities: `utils/types/database.types.ts`.

### Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DECOLECTA_TOKEN          # optional: SUNAT RUC lookup API
```