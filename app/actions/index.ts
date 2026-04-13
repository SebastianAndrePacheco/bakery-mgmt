'use server'

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export type ActionResult = { error: string } | { success: true }

// ─── Helpers ────────────────────────────────────────────────────────────────

const uuid = z.string().uuid('ID inválido')

// Devuelve el primer mensaje de error de Zod en español
function firstError(err: z.ZodError): ActionResult {
  return { error: err.issues[0].message }
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const SupplierSchema = z.object({
  business_name: z.string().min(1, 'Razón social requerida').max(200).trim(),
  ruc: z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos numéricos').optional().or(z.literal('')),
  contact_name: z.string().min(1, 'Nombre de contacto requerido').max(100).trim(),
  phone: z.string().min(7, 'Teléfono inválido (mínimo 7 dígitos)').max(20).trim(),
  email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})

const SupplySchema = z.object({
  code: z.string().min(1, 'Código requerido').max(20).trim().toUpperCase(),
  name: z.string().min(1, 'Nombre requerido').max(200).trim(),
  category_id: uuid,
  unit_id: uuid,
  min_stock: z.number().min(0, 'Stock mínimo no puede ser negativo'),
  storage_conditions: z.string().max(500).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})

const ProductSchema = z.object({
  code: z.string().min(1, 'Código requerido').max(20).trim().toUpperCase(),
  name: z.string().min(1, 'Nombre requerido').max(200).trim(),
  category_id: uuid,
  unit_id: uuid,
  shelf_life_days: z.number().int().min(1, 'Vida útil debe ser al menos 1 día'),
  selling_price: z.number().min(0, 'Precio no puede ser negativo').nullable().optional(),
  is_active: z.boolean().default(true),
})

const RecipeItemSchema = z.object({
  product_id: uuid,
  supply_id: uuid,
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_id: uuid,
  notes: z.string().max(300).optional().or(z.literal('')),
})

const ProductionOrderSchema = z.object({
  product_id: uuid,
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  quantity_planned: z.number().positive('La cantidad debe ser mayor a 0'),
  order_type: z.enum(['programada', 'especial']),
  notes: z.string().max(500).optional().or(z.literal('')),
})


// ─── Supplier Actions ─────────────────────────────────────────────────────────

export async function createSupplier(data: unknown): Promise<ActionResult> {
  const parsed = SupplierSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { ruc, email, address, ...rest } = parsed.data
  const { error } = await supabase.from('suppliers').insert([{
    ...rest,
    ruc: ruc || null,
    email: email || null,
    address: address || null,
  }])

  if (error) return { error: error.message }
  revalidatePath('/compras/proveedores')
  return { success: true }
}

export async function updateSupplier(id: string, data: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const parsed = SupplierSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { ruc, email, address, ...rest } = parsed.data
  const { error } = await supabase.from('suppliers').update({
    ...rest,
    ruc: ruc || null,
    email: email || null,
    address: address || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/compras/proveedores')
  return { success: true }
}


// ─── Supply Actions ───────────────────────────────────────────────────────────

export async function createSupply(data: unknown): Promise<ActionResult> {
  const parsed = SupplySchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { storage_conditions, ...rest } = parsed.data
  const { error } = await supabase.from('supplies').insert([{
    ...rest,
    storage_conditions: storage_conditions || null,
  }])

  if (error) return { error: error.message }
  revalidatePath('/inventario/insumos')
  return { success: true }
}

export async function updateSupply(id: string, data: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const parsed = SupplySchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { storage_conditions, ...rest } = parsed.data
  const { error } = await supabase.from('supplies').update({
    ...rest,
    storage_conditions: storage_conditions || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/inventario/insumos')
  return { success: true }
}


// ─── Product Actions ──────────────────────────────────────────────────────────

export async function createProduct(data: unknown): Promise<ActionResult> {
  const parsed = ProductSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase.from('products').insert([parsed.data])

  if (error) return { error: error.message }
  revalidatePath('/produccion/productos')
  return { success: true }
}

export async function updateProduct(id: string, data: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const parsed = ProductSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase.from('products').update(parsed.data).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/produccion/productos')
  return { success: true }
}


// ─── Recipe Actions ───────────────────────────────────────────────────────────

export async function createRecipeItem(data: unknown): Promise<ActionResult> {
  const parsed = RecipeItemSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { notes, ...rest } = parsed.data
  const { error } = await supabase.from('product_recipes').insert([{
    ...rest,
    notes: notes || null,
  }])

  if (error) {
    if (error.code === '23505') return { error: 'Este insumo ya está en la receta' }
    return { error: error.message }
  }

  revalidatePath('/produccion/productos')
  return { success: true }
}

export async function deleteRecipeItem(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase.from('product_recipes').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/produccion/productos')
  return { success: true }
}


// ─── Production Order Actions ─────────────────────────────────────────────────

export async function createProductionOrder(data: unknown): Promise<ActionResult> {
  const parsed = ProductionOrderSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user } = await getUser()
  if (!user) return { error: 'No autorizado' }

  const orderNumber = `PROD-${Date.now()}`
  const { notes, ...rest } = parsed.data

  const { error } = await supabase.from('production_orders').insert([{
    ...rest,
    order_number: orderNumber,
    production_date: parsed.data.scheduled_date,
    status: 'programada',
    notes: notes || null,
  }])

  if (error) return { error: error.message }
  revalidatePath('/produccion/ordenes')
  return { success: true }
}


// ─── Login Action (con rate limiting) ────────────────────────────────────────

// Mapa en memoria: ip → { intentos, bloqueadoHasta }
// Válido para un solo servidor; suficiente para uso interno de panadería.
const _loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS  = 5  * 60 * 1000  // ventana de 5 min
const LOCKOUT_MS = 15 * 60 * 1000  // bloqueo de 15 min tras agotar intentos

export async function loginUser(email: string, password: string): Promise<ActionResult> {
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const now = Date.now()

  const entry = _loginAttempts.get(ip)
  if (entry && now < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    const remaining = Math.ceil((entry.resetAt - now) / 60_000)
    return { error: `Demasiados intentos fallidos. Espera ${remaining} minuto(s) e intenta de nuevo.` }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (!entry || now >= entry.resetAt) {
      _loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    } else {
      entry.count++
      // Al llegar al límite extendemos el bloqueo
      if (entry.count >= MAX_ATTEMPTS) entry.resetAt = now + LOCKOUT_MS
    }
    return { error: 'Correo o contraseña incorrectos' }
  }

  // Éxito: limpiar contador
  _loginAttempts.delete(ip)
  return { success: true }
}
