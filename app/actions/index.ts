'use server'

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export type ActionResult = { error: string } | { success: true }

// ─── Helpers ────────────────────────────────────────────────────────────────

const uuid = z.string().uuid('ID inválido')

// Devuelve el primer mensaje de error de Zod en español
function firstError(err: z.ZodError): ActionResult {
  return { error: err.issues[0].message }
}

/**
 * Sanitiza errores de Supabase/PostgreSQL para no exponer detalles internos al cliente.
 * Loguea el error completo en el servidor y retorna un mensaje genérico en español.
 */
function dbError(error: { code?: string; message?: string } | null | undefined, context: string): ActionResult {
  console.error(`[DB:${context}]`, error)
  if (!error) return { error: 'Error desconocido' }

  switch (error.code) {
    case '23505': return { error: 'Este registro ya existe' }
    case '23503': return { error: 'El registro está referenciado por otros datos' }
    case '23502': return { error: 'Falta información obligatoria' }
    case '23514': return { error: 'Los datos no cumplen las restricciones' }
    case '42501': return { error: 'No tienes permisos para esta operación' }
    case 'PGRST116': return { error: 'Registro no encontrado' }
    default: return { error: 'No se pudo completar la operación' }
  }
}

async function getUserWithRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return { supabase, user, role: profile?.role as string | null }
}

/**
 * Rate limiter en memoria por clave (usuario+acción). Válido para un único servidor —
 * suficiente para el uso interno de panadería. Para producción multi-instancia,
 * migrar a Redis u otro store compartido.
 */
const _actionAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, limit: number, windowMs: number): ActionResult | null {
  const now = Date.now()
  const entry = _actionAttempts.get(key)

  if (!entry || now >= entry.resetAt) {
    _actionAttempts.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (entry.count >= limit) {
    const remaining = Math.ceil((entry.resetAt - now) / 1000)
    return { error: `Demasiadas operaciones. Espera ${remaining} segundo(s) e intenta de nuevo.` }
  }

  entry.count++
  return null
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const opt = z.string().max(500).optional().or(z.literal(''))
const optEmail = z.string().email('Email inválido').max(255).optional().or(z.literal(''))

const SupplierSchema = z.object({
  // Empresa
  business_name:    z.string().min(1, 'Razón social requerida').max(200).trim(),
  ruc:              z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos numéricos').optional().or(z.literal('')),
  nombre_comercial: opt,
  tipo_proveedor:   opt,
  estado_sunat:     opt,
  condicion_sunat:  opt,
  direccion_fiscal: opt,
  telefono_empresa: z.string().max(20).optional().or(z.literal('')),
  email_empresa:    optEmail,
  web:              opt,
  // Contacto
  contact_name:     z.string().min(1, 'Nombre del contacto requerido').max(100).trim(),
  contact_cargo:    z.string().max(100).optional().or(z.literal('')),
  contact_dni:      z.string().max(20).optional().or(z.literal('')),
  contact_phone:    z.string().max(20).optional().or(z.literal('')),
  contact_email:    optEmail,
  contact_whatsapp: z.string().max(20).optional().or(z.literal('')),
  categoria_suministro: z.string().max(100).optional().or(z.literal('')),
  // Campos legacy (se mantienen por compatibilidad con columnas NOT NULL en DB)
  phone:            z.string().max(20).optional().or(z.literal('')),
  email:            optEmail,
  address:          opt,
  // Pago
  banco:            z.string().max(100).optional().or(z.literal('')),
  tipo_cuenta:      z.enum(['ahorros', 'corriente']).optional(),
  numero_cuenta:    z.string().max(30).optional().or(z.literal('')),
  cci:              z.string().max(20).optional().or(z.literal('')),
  moneda:           z.string().max(10).optional().or(z.literal('')),
  is_active:        z.boolean().default(true),
})

const SupplySchema = z.object({
  code: z.string().min(1, 'Código requerido').max(20).trim().toUpperCase(),
  name: z.string().min(1, 'Nombre requerido').max(200).trim(),
  category_id: uuid,
  unit_id: uuid,
  min_stock: z.number().min(0, 'Stock mínimo no puede ser negativo'),
  storage_conditions: z.string().max(500).optional().or(z.literal('')),
  tasa_igv: z.number().min(0).max(100).default(18),
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
  notes: z.string().max(300).optional().or(z.literal('')),
})

const today = () => new Date().toISOString().split('T')[0]

const ProductionOrderSchema = z.object({
  product_id: uuid,
  scheduled_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine(d => d >= today(), 'La fecha no puede ser en el pasado'),
  quantity_planned: z.number().positive('La cantidad debe ser mayor a 0'),
  order_type: z.enum(['programada', 'especial']),
  notes: z.string().max(500).optional().or(z.literal('')),
})

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const PurchaseOrderItemSchema = z.object({
  supply_id: uuid,
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_price: z.number().min(0, 'Precio no puede ser negativo'),
  total: z.number().min(0, 'Total no puede ser negativo'),
})

const CreatePurchaseOrderSchema = z.object({
  supplier_id: uuid,
  order_date: z.string().regex(dateRegex, 'Fecha inválida'),
  expected_delivery_date: z.string().regex(dateRegex, 'Fecha inválida').optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  items: z.array(PurchaseOrderItemSchema).min(1, 'Debe agregar al menos un insumo'),
})

const ReceiveOrderItemSchema = z.object({
  supply_id: uuid,
  quantity_received: z.number().positive('Cantidad recibida debe ser mayor a 0'),
  unit_price: z.number().min(0, 'Precio no puede ser negativo'),
  expiration_date: z.string().regex(dateRegex, 'Fecha inválida').optional().or(z.literal('')),
})

const ReceiveOrderSchema = z.object({
  order_id: uuid,
  received_date: z.string().regex(dateRegex, 'Fecha inválida'),
  guia_remision: z.string().min(1, 'Guía de remisión requerida').max(50).trim(),
  comprobante_tipo: z.enum(['factura', 'boleta', 'ticket', 'recibo']),
  comprobante_serie: z.string().min(1, 'Serie requerida').max(20).trim(),
  comprobante_numero: z.string().min(1, 'Número requerido').max(30).trim(),
  comprobante_fecha: z.string().regex(dateRegex, 'Fecha inválida'),
  comprobante_monto: z.number().min(0, 'Monto no puede ser negativo'),
  items: z.array(ReceiveOrderItemSchema).min(1, 'Debe recibir al menos un insumo'),
})

const AdjustmentSchema = z.object({
  entity_type: z.enum(['insumo', 'producto']),
  entity_id: uuid,
  adjustment_type: z.enum(['entrada', 'salida']),
  quantity: z.number().positive('Cantidad debe ser mayor a 0'),
  reason: z.string().min(1, 'Motivo requerido').max(50),
  notes: z.string().max(500).optional().or(z.literal('')),
  movement_date: z.string().regex(dateRegex, 'Fecha inválida'),
  unit_id: uuid,
  unit_price: z.number().min(0, 'Precio no puede ser negativo').default(0),
})

const CompleteProductionSchema = z.object({
  order_id: uuid,
  quantity_produced: z.number().positive('Cantidad debe ser mayor a 0'),
  production_date: z.string().regex(dateRegex, 'Fecha inválida'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type ProductionResult = {
  batch_code: string
  quantity_produced: number
  total_cost: number
  unit_cost: number
  expiration_date: string
}


// ─── Supplier Actions ─────────────────────────────────────────────────────────

function buildSupplierPayload(d: z.infer<typeof SupplierSchema>) {
  return {
    ...d,
    ruc:              d.ruc              || null,
    email:            d.email            || d.contact_email  || null,
    address:          d.address          || d.direccion_fiscal || null,
    // phone es NOT NULL en DB — sincronizar desde contact_phone o telefono_empresa
    phone:            d.contact_phone    || d.telefono_empresa || d.phone || '',
    nombre_comercial: d.nombre_comercial || null,
    tipo_proveedor:   d.tipo_proveedor   || null,
    estado_sunat:     d.estado_sunat     || null,
    condicion_sunat:  d.condicion_sunat  || null,
    direccion_fiscal: d.direccion_fiscal || null,
    telefono_empresa: d.telefono_empresa || null,
    email_empresa:    d.email_empresa    || null,
    web:              d.web              || null,
    contact_cargo:    d.contact_cargo    || null,
    contact_dni:      d.contact_dni      || null,
    contact_phone:    d.contact_phone    || null,
    contact_email:    d.contact_email    || null,
    contact_whatsapp:     d.contact_whatsapp     || null,
    categoria_suministro: d.categoria_suministro || null,
    banco:                d.banco                || null,
    tipo_cuenta:      d.tipo_cuenta      ?? null,
    numero_cuenta:    d.numero_cuenta    || null,
    cci:              d.cci              || null,
    moneda:           d.moneda           || 'PEN',
  }
}

export async function createSupplier(data: unknown): Promise<ActionResult> {
  const parsed = SupplierSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { error } = await supabase.from('suppliers').insert([buildSupplierPayload(parsed.data)])
  if (error) return dbError(error, 'createSupplier')
  revalidatePath('/compras/proveedores')
  return { success: true }
}

export async function updateSupplier(id: string, data: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const parsed = SupplierSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { error } = await supabase.from('suppliers').update(buildSupplierPayload(parsed.data)).eq('id', id)
  if (error) return dbError(error, 'updateSupplier')
  revalidatePath('/compras/proveedores')
  revalidatePath(`/compras/proveedores/${id}`)
  return { success: true }
}


// ─── Supply Actions ───────────────────────────────────────────────────────────

export async function createSupply(data: unknown): Promise<ActionResult> {
  const parsed = SupplySchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { storage_conditions, ...rest } = parsed.data
  const { error } = await supabase.from('supplies').insert([{
    ...rest,
    storage_conditions: storage_conditions || null,
  }])

  if (error) return dbError(error, 'createSupply')
  revalidatePath('/inventario/insumos')
  return { success: true }
}

export async function updateSupply(id: string, data: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const parsed = SupplySchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { storage_conditions, ...rest } = parsed.data
  const { error } = await supabase.from('supplies').update({
    ...rest,
    storage_conditions: storage_conditions || null,
  }).eq('id', id)

  if (error) return dbError(error, 'updateSupply')
  revalidatePath('/inventario/insumos')
  return { success: true }
}


// ─── Product Actions ──────────────────────────────────────────────────────────

export async function createProduct(data: unknown): Promise<ActionResult> {
  const parsed = ProductSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { error } = await supabase.from('products').insert([parsed.data])

  if (error) return dbError(error, 'createProduct')
  revalidatePath('/produccion/productos')
  return { success: true }
}

export async function updateProduct(id: string, data: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const parsed = ProductSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { error } = await supabase.from('products').update(parsed.data).eq('id', id)

  if (error) return dbError(error, 'updateProduct')
  revalidatePath('/produccion/productos')
  return { success: true }
}


// ─── Recipe Actions ───────────────────────────────────────────────────────────

export async function createRecipeItem(data: unknown): Promise<ActionResult> {
  const parsed = RecipeItemSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { notes, product_id, supply_id, quantity } = parsed.data

  const { data: supply, error: supplyErr } = await supabase
    .from('supplies')
    .select('unit_id')
    .eq('id', supply_id)
    .single()

  if (supplyErr || !supply) return { error: 'Insumo no encontrado' }

  const { error } = await supabase.from('product_recipes').insert([{
    product_id,
    supply_id,
    quantity,
    unit_id: supply.unit_id,
    notes: notes || null,
  }])

  if (error) {
    if (error.code === '23505') return { error: 'Este insumo ya está en la receta' }
    return dbError(error, 'createRecipeItem')
  }

  revalidatePath('/produccion/productos')
  return { success: true }
}

export async function deleteRecipeItem(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { error } = await supabase.from('product_recipes').delete().eq('id', id)

  if (error) return dbError(error, 'deleteRecipeItem')
  revalidatePath('/produccion/productos')
  return { success: true }
}


// ─── User Management Actions (admin only) ────────────────────────────────────

const CreateUserSchema = z.object({
  email:       z.string().email('Email inválido'),
  password:    z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  full_name:   z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100).trim(),
  role:        z.enum(['admin', 'panadero', 'cajero']),
  phone:       z.string().max(20).trim().optional().or(z.literal('')),
  empleado_id: z.string().uuid().optional().or(z.literal('')),
})

const UpdateUserSchema = z.object({
  full_name:   z.string().min(2).max(100).trim(),
  role:        z.enum(['admin', 'panadero', 'cajero']),
  phone:       z.string().max(20).trim().optional().or(z.literal('')),
  is_active:   z.boolean(),
  empleado_id: z.string().uuid().optional().or(z.literal('')),
})

export async function adminCreateUser(data: unknown): Promise<ActionResult> {
  const parsed = CreateUserSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { email, password, full_name, role: newRole, phone, empleado_id } = parsed.data

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: 'Ya existe un usuario con ese email' }
    }
    return { error: 'Error al crear usuario: ' + authError.message }
  }

  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      id:          authUser.user.id,
      full_name,
      role:        newRole,
      phone:       phone || null,
      is_active:   true,
      empleado_id: empleado_id || null,
    })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return { error: 'Error al crear perfil de usuario' }
  }

  // Si se vinculó un empleado, actualizar también empleados.user_id
  if (empleado_id) {
    await supabaseAdmin
      .from('empleados')
      .update({ user_id: authUser.user.id })
      .eq('id', empleado_id)
  }

  revalidatePath('/usuarios')
  revalidatePath('/empleados')
  return { success: true }
}

export async function adminUpdateUser(id: string, data: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }

  const parsed = UpdateUserSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }
  if (id === user.id) return { error: 'No puedes modificar tu propio perfil desde aquí' }

  const { full_name, role: newRole, phone, is_active, empleado_id } = parsed.data

  // Obtener empleado_id anterior para desvincularlo si cambia
  const { data: prevProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('empleado_id')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ full_name, role: newRole, phone: phone || null, is_active, empleado_id: empleado_id || null })
    .eq('id', id)

  if (error) return { error: 'Error al actualizar usuario' }

  // Desvincular empleado anterior si cambió
  if (prevProfile?.empleado_id && prevProfile.empleado_id !== empleado_id) {
    await supabaseAdmin
      .from('empleados')
      .update({ user_id: null })
      .eq('id', prevProfile.empleado_id)
  }

  // Vincular nuevo empleado
  if (empleado_id) {
    await supabaseAdmin
      .from('empleados')
      .update({ user_id: id })
      .eq('id', empleado_id)
  }

  revalidatePath('/usuarios')
  revalidatePath('/empleados')
  return { success: true }
}

export async function adminResetPassword(id: string, password: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' }

  const { user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }
  if (id === user.id) return { error: 'No puedes cambiar tu propia contraseña desde aquí' }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
  if (error) return { error: 'Error al cambiar contraseña' }

  return { success: true }
}


// ─── Production Order Actions ─────────────────────────────────────────────────

export async function createProductionOrder(data: unknown): Promise<ActionResult> {
  const parsed = ProductionOrderSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (!['admin', 'panadero'].includes(role ?? '')) return { error: 'Se requiere rol administrador o panadero' }

  const orderNumber = `PROD-${Date.now()}`
  const { notes, ...rest } = parsed.data

  const { error } = await supabase.from('production_orders').insert([{
    ...rest,
    order_number: orderNumber,
    production_date: parsed.data.scheduled_date,
    status: 'programada',
    notes: notes || null,
  }])

  if (error) return dbError(error, 'createProductionOrder')
  revalidatePath('/produccion/ordenes')
  return { success: true }
}


// ─── Purchase Order Actions ──────────────────────────────────────────────────

export async function createPurchaseOrder(data: unknown): Promise<ActionResult> {
  const parsed = CreatePurchaseOrderSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const limited = checkRateLimit(`createPurchaseOrder:${user.id}`, 10, 60_000)
  if (limited) return limited

  const orderNumber = `OC-${Date.now()}`

  const { error } = await supabase.rpc('create_purchase_order_with_items', {
    p_supplier_id: parsed.data.supplier_id,
    p_order_date: parsed.data.order_date,
    p_expected_delivery_date: parsed.data.expected_delivery_date || null,
    p_notes: parsed.data.notes || null,
    p_order_number: orderNumber,
    p_subtotal: parsed.data.subtotal,
    p_tax: parsed.data.tax,
    p_total: parsed.data.total,
    p_items: parsed.data.items,
  })

  if (error) return dbError(error, 'createPurchaseOrder')

  // La orden se crea como 'pendiente' por el RPC; la marcamos como borrador
  await supabase
    .from('purchase_orders')
    .update({ status: 'borrador' })
    .eq('order_number', orderNumber)

  revalidatePath('/compras/ordenes')
  return { success: true }
}

export async function receivePurchaseOrder(data: unknown): Promise<ActionResult> {
  const parsed = ReceiveOrderSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (!['admin', 'panadero'].includes(role ?? '')) {
    return { error: 'Se requiere rol administrador o panadero' }
  }

  const limited = checkRateLimit(`receivePurchaseOrder:${user.id}`, 10, 60_000)
  if (limited) return limited

  // Construir batch_codes en servidor (no confiar en cliente)
  const [{ data: order }, { data: supplies }] = await Promise.all([
    supabase.from('purchase_orders').select('order_number').eq('id', parsed.data.order_id).single(),
    supabase.from('supplies').select('id, code').in('id', parsed.data.items.map(i => i.supply_id)),
  ])

  if (!order) return { error: 'Orden no encontrada' }
  const supplyMap = Object.fromEntries((supplies ?? []).map(s => [s.id, s.code]))
  const ts = Date.now()

  const itemsPayload = parsed.data.items.map(item => ({
    supply_id: item.supply_id,
    batch_code: `LOTE-${order.order_number}-${supplyMap[item.supply_id] ?? 'UNK'}-${ts}`,
    quantity_received: item.quantity_received,
    unit_price: item.unit_price,
    expiration_date: item.expiration_date || null,
  }))

  const { error } = await supabase.rpc('receive_purchase_order', {
    p_order_id: parsed.data.order_id,
    p_received_date: parsed.data.received_date,
    p_guia_remision: parsed.data.guia_remision,
    p_comprobante_tipo: parsed.data.comprobante_tipo,
    p_comprobante_serie: parsed.data.comprobante_serie,
    p_comprobante_numero: parsed.data.comprobante_numero,
    p_comprobante_fecha: parsed.data.comprobante_fecha,
    p_comprobante_monto: parsed.data.comprobante_monto,
    p_items: itemsPayload,
  })

  if (error) return dbError(error, 'receivePurchaseOrder')

  // Actualizar correlativo si el número registrado supera el último guardado
  const numericNum = parseInt(parsed.data.comprobante_numero.replace(/\D/g, '')) || 0
  if (numericNum > 0) {
    const { data: corr } = await supabase
      .from('comprobante_correlativos')
      .select('ultimo_numero')
      .eq('tipo', parsed.data.comprobante_tipo)
      .eq('serie', parsed.data.comprobante_serie)
      .maybeSingle()

    if (numericNum > (corr?.ultimo_numero ?? 0)) {
      await supabase.from('comprobante_correlativos').upsert(
        { tipo: parsed.data.comprobante_tipo, serie: parsed.data.comprobante_serie, ultimo_numero: numericNum },
        { onConflict: 'tipo,serie' }
      )
    }
  }

  revalidatePath('/compras/ordenes')
  revalidatePath('/inventario/insumos')
  revalidatePath('/inventario/kardex')
  return { success: true }
}

// ─── Correlativo de comprobantes ─────────────────────────────────────────────

export async function getNextCorrelativo(tipo: string, serie: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('comprobante_correlativos')
    .select('ultimo_numero')
    .eq('tipo', tipo)
    .eq('serie', serie)
    .maybeSingle()
  const next = (data?.ultimo_numero ?? 0) + 1
  return String(next).padStart(8, '0')
}


// ─── Inventory Adjustment Action ─────────────────────────────────────────────

export async function recordAdjustment(data: unknown): Promise<ActionResult> {
  const parsed = AdjustmentSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const limited = checkRateLimit(`recordAdjustment:${user.id}`, 15, 60_000)
  if (limited) return limited

  const { error } = await supabase.rpc('record_inventory_adjustment', {
    p_entity_type: parsed.data.entity_type,
    p_entity_id: parsed.data.entity_id,
    p_adjustment_type: parsed.data.adjustment_type,
    p_quantity: parsed.data.quantity,
    p_reason: parsed.data.reason,
    p_notes: parsed.data.notes || '',
    p_movement_date: parsed.data.movement_date,
    p_unit_id: parsed.data.unit_id,
    p_unit_price: parsed.data.unit_price,
  })

  if (error) return dbError(error, 'recordAdjustment')
  revalidatePath('/inventario/ajustes')
  revalidatePath('/inventario/kardex')
  return { success: true }
}


// ─── Production Completion Action ────────────────────────────────────────────

export async function completeProductionOrder(
  data: unknown
): Promise<{ error: string } | { success: true; data: ProductionResult }> {
  const parsed = CompleteProductionSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error) as { error: string }

  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (!['admin', 'panadero'].includes(role ?? '')) {
    return { error: 'Se requiere rol administrador o panadero' }
  }

  const limited = checkRateLimit(`completeProductionOrder:${user.id}`, 10, 60_000)
  if (limited) return limited as { error: string }

  const { data: result, error } = await supabase.rpc('complete_production_order', {
    p_order_id: parsed.data.order_id,
    p_quantity_produced: parsed.data.quantity_produced,
    p_production_date: parsed.data.production_date,
    p_notes: parsed.data.notes || '',
  })

  if (error) return dbError(error, 'completeProductionOrder') as { error: string }
  revalidatePath('/produccion/ordenes')
  revalidatePath('/inventario/kardex')
  return { success: true, data: result as ProductionResult }
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // Registrar intento en login_logs (no bloqueante)
  supabaseAdmin.from('login_logs').insert({
    email,
    ip,
    success: !error,
    user_id: data?.user?.id ?? null,
  }).then(() => {}).catch(() => {})

  if (error) {
    if (!entry || now >= entry.resetAt) {
      _loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    } else {
      entry.count++
      if (entry.count >= MAX_ATTEMPTS) entry.resetAt = now + LOCKOUT_MS
    }
    return { error: 'Correo o contraseña incorrectos' }
  }

  _loginAttempts.delete(ip)
  return { success: true }
}

// ─── Recuperación de contraseña ──────────────────────────────────────────────

export async function sendPasswordReset(email: string): Promise<ActionResult> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Correo electrónico inválido' }
  }

  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/nueva-clave`,
  })

  // Nunca revelar si el email existe o no (evitar enumeración)
  if (error) console.error('[sendPasswordReset]', error.message)
  return { success: true }
}

export async function updatePassword(newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' }
  return { success: true }
}


// ─── CARGOS ──────────────────────────────────────────────────────────────────

const CargoSchema = z.object({
  nombre:      z.string().min(1, 'Nombre requerido').max(100).trim(),
  descripcion: z.string().max(300).optional().or(z.literal('')),
  is_active:   z.boolean().default(true),
})

export async function createCargo(data: unknown): Promise<ActionResult> {
  const parsed = CargoSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('cargos').insert(parsed.data)
  if (error) return dbError(error, 'createCargo')

  revalidatePath('/empleados/cargos')
  return { success: true }
}

export async function updateCargo(id: string, data: unknown): Promise<ActionResult> {
  const idParsed = uuid.safeParse(id)
  if (!idParsed.success) return { error: 'ID inválido' }

  const parsed = CargoSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('cargos').update(parsed.data).eq('id', id)
  if (error) return dbError(error, 'updateCargo')

  revalidatePath('/empleados/cargos')
  return { success: true }
}

export async function toggleCargoStatus(id: string, is_active: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('cargos').update({ is_active }).eq('id', id)
  if (error) return dbError(error, 'toggleCargoStatus')

  revalidatePath('/empleados/cargos')
  return { success: true }
}

// ─── EMPLEADOS ───────────────────────────────────────────────────────────────

const PersonaSchema = z.object({
  tipo_doc:         z.enum(['DNI', 'CE', 'Pasaporte']),
  numero_doc:       z.string().min(8, 'Documento inválido').max(20).trim(),
  nombres:          z.string().min(1, 'Nombres requeridos').max(100).trim(),
  apellido_paterno: z.string().min(1, 'Apellido paterno requerido').max(100).trim(),
  apellido_materno: z.string().max(100).optional().or(z.literal('')),
  fecha_nacimiento: z.string().regex(dateRegex, 'Fecha inválida').optional().or(z.literal('')),
  genero:           z.enum(['M', 'F', 'Otro']).optional(),
  telefono:         z.string().max(20).optional().or(z.literal('')),
  email:            z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  direccion:        z.string().max(500).optional().or(z.literal('')),
})

const EmpleadoLaboralSchema = z.object({
  cargo_id:       uuid,
  fecha_ingreso:  z.string().regex(dateRegex, 'Fecha inválida'),
  fecha_cese:     z.string().regex(dateRegex, 'Fecha inválida').optional().or(z.literal('')),
  tipo_contrato:  z.enum(['indefinido', 'plazo_fijo', 'part_time', 'recibo_honorarios']),
  sueldo_base:    z.number().min(0).optional().nullable(),
  banco:          z.string().max(100).optional().or(z.literal('')),
  tipo_cuenta:    z.enum(['ahorros', 'corriente']).optional(),
  numero_cuenta:  z.string().max(30).optional().or(z.literal('')),
  cci:            z.string().max(20).optional().or(z.literal('')),
  is_active:      z.boolean().default(true),
})

const CreateEmpleadoSchema = z.object({
  persona:  PersonaSchema,
  laboral:  EmpleadoLaboralSchema,
})

export async function createEmpleado(data: unknown): Promise<ActionResult> {
  const parsed = CreateEmpleadoSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const supabase = await createClient()

  // 1. Crear persona
  const { data: persona, error: personaErr } = await supabase
    .from('personas')
    .insert(parsed.data.persona)
    .select('id')
    .single()

  if (personaErr) return dbError(personaErr, 'createEmpleado:persona')

  // 2. Crear empleado con la persona recién creada
  const { error: empErr } = await supabase.from('empleados').insert({
    ...parsed.data.laboral,
    persona_id:    persona.id,
    fecha_cese:    parsed.data.laboral.fecha_cese || null,
    tipo_cuenta:   parsed.data.laboral.tipo_cuenta ?? null,
  })

  if (empErr) {
    // Compensar: borrar persona si el empleado falló
    await supabase.from('personas').delete().eq('id', persona.id)
    return dbError(empErr, 'createEmpleado:empleado')
  }

  revalidatePath('/empleados')
  return { success: true }
}

export async function updateEmpleado(
  empleadoId: string,
  personaId: string,
  data: unknown,
): Promise<ActionResult> {
  const parsed = CreateEmpleadoSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const supabase = await createClient()

  const { error: personaErr } = await supabase
    .from('personas')
    .update(parsed.data.persona)
    .eq('id', personaId)

  if (personaErr) return dbError(personaErr, 'updateEmpleado:persona')

  const { error: empErr } = await supabase
    .from('empleados')
    .update({
      ...parsed.data.laboral,
      fecha_cese:  parsed.data.laboral.fecha_cese || null,
      tipo_cuenta: parsed.data.laboral.tipo_cuenta ?? null,
    })
    .eq('id', empleadoId)

  if (empErr) return dbError(empErr, 'updateEmpleado:empleado')

  revalidatePath('/empleados')
  revalidatePath(`/empleados/${empleadoId}`)
  return { success: true }
}

export async function toggleEmpleadoStatus(id: string, is_active: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('empleados').update({ is_active }).eq('id', id)
  if (error) return dbError(error, 'toggleEmpleadoStatus')

  revalidatePath('/empleados')
  return { success: true }
}


// ─── EMPRESA CONFIG ──────────────────────────────────────────────────────────

const EmpresaConfigSchema = z.object({
  razon_social:     z.string().min(1, 'Razón social requerida').max(200).trim(),
  nombre_comercial: z.string().max(200).optional().or(z.literal('')),
  ruc:              z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos').optional().or(z.literal('')),
  direccion_fiscal: z.string().max(500).optional().or(z.literal('')),
  telefono:         z.string().max(30).optional().or(z.literal('')),
  email:            z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  web:              z.string().max(255).optional().or(z.literal('')),
  igv:              z.number().min(0).max(100),
  moneda:           z.enum(['PEN', 'USD']),
  logo_url:         z.string().max(500).optional().or(z.literal('')),
})

export async function upsertEmpresaConfig(data: unknown): Promise<ActionResult> {
  const parsed = EmpresaConfigSchema.safeParse(data)
  if (!parsed.success) return firstError(parsed.error)

  const { supabase, user, role } = await getUserWithRole()
  if (!user)          return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  // Obtener el id de la fila singleton
  const { data: existing } = await supabase
    .from('empresa_config')
    .select('id')
    .single()

  const payload = {
    ...parsed.data,
    ruc:              parsed.data.ruc              || null,
    nombre_comercial: parsed.data.nombre_comercial || null,
    direccion_fiscal: parsed.data.direccion_fiscal || null,
    telefono:         parsed.data.telefono         || null,
    email:            parsed.data.email            || null,
    web:              parsed.data.web              || null,
    logo_url:         parsed.data.logo_url         || null,
  }

  if (existing) {
    const { error } = await supabase
      .from('empresa_config')
      .update(payload)
      .eq('id', existing.id)
    if (error) return dbError(error, 'upsertEmpresaConfig:update')
  } else {
    const { error } = await supabase
      .from('empresa_config')
      .insert(payload)
    if (error) return dbError(error, 'upsertEmpresaConfig:insert')
  }

  revalidatePath('/configuracion')
  return { success: true }
}

// ─── Purchase Order Approval Actions ─────────────────────────────────────────

export async function submitForApproval(orderId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(orderId).success) return { error: 'ID inválido' }
  const { supabase, user } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }

  const { data: order } = await supabase
    .from('purchase_orders').select('status').eq('id', orderId).single()
  if (!order) return { error: 'Orden no encontrada' }
  if (order.status !== 'borrador') return { error: 'Solo se pueden enviar órdenes en borrador' }

  const { error } = await supabase
    .from('purchase_orders').update({ status: 'pendiente_aprobacion' }).eq('id', orderId)
  if (error) return dbError(error, 'submitForApproval')

  await supabase.from('purchase_order_approvals').insert({
    purchase_order_id: orderId, action: 'submitted', created_by: user.id,
  })

  revalidatePath('/compras/ordenes')
  revalidatePath(`/compras/ordenes/${orderId}`)
  return { success: true }
}

export async function approveOrder(orderId: string, comment?: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(orderId).success) return { error: 'ID inválido' }
  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { data: order } = await supabase
    .from('purchase_orders').select('status').eq('id', orderId).single()
  if (!order) return { error: 'Orden no encontrada' }
  if (order.status !== 'pendiente_aprobacion') return { error: 'La orden no está pendiente de aprobación' }

  const { error } = await supabase
    .from('purchase_orders').update({ status: 'aprobado' }).eq('id', orderId)
  if (error) return dbError(error, 'approveOrder')

  await supabase.from('purchase_order_approvals').insert({
    purchase_order_id: orderId, action: 'approved',
    comment: comment || null, created_by: user.id,
  })

  revalidatePath('/compras/ordenes')
  revalidatePath(`/compras/ordenes/${orderId}`)
  return { success: true }
}

export async function rejectOrder(orderId: string, comment: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(orderId).success) return { error: 'ID inválido' }
  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { data: order } = await supabase
    .from('purchase_orders').select('status').eq('id', orderId).single()
  if (!order) return { error: 'Orden no encontrada' }
  if (order.status !== 'pendiente_aprobacion') return { error: 'La orden no está pendiente de aprobación' }

  const { error } = await supabase
    .from('purchase_orders').update({ status: 'rechazado' }).eq('id', orderId)
  if (error) return dbError(error, 'rejectOrder')

  await supabase.from('purchase_order_approvals').insert({
    purchase_order_id: orderId, action: 'rejected',
    comment: comment || null, created_by: user.id,
  })

  revalidatePath('/compras/ordenes')
  revalidatePath(`/compras/ordenes/${orderId}`)
  return { success: true }
}

export async function markOrderSent(orderId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(orderId).success) return { error: 'ID inválido' }
  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { data: order } = await supabase
    .from('purchase_orders').select('status').eq('id', orderId).single()
  if (!order) return { error: 'Orden no encontrada' }
  if (order.status !== 'aprobado') return { error: 'Solo se pueden enviar órdenes aprobadas' }

  const { error } = await supabase
    .from('purchase_orders').update({ status: 'enviado' }).eq('id', orderId)
  if (error) return dbError(error, 'markOrderSent')

  await supabase.from('purchase_order_approvals').insert({
    purchase_order_id: orderId, action: 'sent', created_by: user.id,
  })

  revalidatePath('/compras/ordenes')
  revalidatePath(`/compras/ordenes/${orderId}`)
  return { success: true }
}

export async function cancelOrder(orderId: string, comment?: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(orderId).success) return { error: 'ID inválido' }
  const { supabase, user, role } = await getUserWithRole()
  if (!user) return { error: 'No autorizado' }
  if (role !== 'admin') return { error: 'Se requiere rol administrador' }

  const { data: order } = await supabase
    .from('purchase_orders').select('status').eq('id', orderId).single()
  if (!order) return { error: 'Orden no encontrada' }
  const cancelable = ['borrador', 'pendiente_aprobacion', 'aprobado']
  if (!cancelable.includes(order.status)) return { error: 'Esta orden no puede cancelarse' }

  const { error } = await supabase
    .from('purchase_orders').update({ status: 'cancelado' }).eq('id', orderId)
  if (error) return dbError(error, 'cancelOrder')

  await supabase.from('purchase_order_approvals').insert({
    purchase_order_id: orderId, action: 'cancelled',
    comment: comment || null, created_by: user.id,
  })

  revalidatePath('/compras/ordenes')
  revalidatePath(`/compras/ordenes/${orderId}`)
  return { success: true }
}

// ─── Cargo Permisos ──────────────────────────────────────────────────────────

export async function setCargoPermisos(
  cargoId: string,
  modulos: string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Borrar todos los permisos actuales del cargo
  const { error: delError } = await supabase
    .from('cargo_permisos')
    .delete()
    .eq('cargo_id', cargoId)

  if (delError) return { error: delError.message }

  // Insertar los nuevos (si hay alguno)
  if (modulos.length > 0) {
    const { error: insError } = await supabase
      .from('cargo_permisos')
      .insert(modulos.map(modulo => ({ cargo_id: cargoId, modulo })))

    if (insError) return { error: insError.message }
  }

  revalidatePath('/configuracion/permisos')
  return { success: true }
}
