-- =====================================================
-- RLS POR ROLES — Sistema de Gestión de Panadería
--
-- INSTRUCCIONES: Ejecutar en Supabase > SQL Editor
--
-- Roles del sistema:
--   admin    → acceso total
--   panadero → producción + inventario (lectura de compras)
--   cajero   → dashboard + reportes + productos terminados
-- =====================================================


-- =====================================================
-- FUNCIÓN HELPER: obtener el rol del usuario actual
-- Usada en las políticas RLS de todas las tablas
-- STABLE = el resultado se cachea por transacción (performance)
-- NOTA: se crea en schema public porque Supabase SQL Editor
--       no permite crear funciones en el schema auth.
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role::TEXT FROM public.user_profiles WHERE id = auth.uid();
$$;


-- =====================================================
-- ELIMINAR POLÍTICAS PERMISIVAS ANTERIORES
-- =====================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'Allow authenticated users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users" ON %I.%I',
                   r.schemaname, r.tablename);
  END LOOP;
END;
$$;


-- =====================================================
-- categories  (catálogo maestro)
-- Lectura: todos | Escritura: admin
-- =====================================================
CREATE POLICY "categories_read" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categories_write" ON categories
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "categories_update" ON categories
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "categories_delete" ON categories
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- units  (catálogo de unidades)
-- Lectura: todos | Escritura: admin
-- =====================================================
CREATE POLICY "units_read" ON units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "units_write" ON units
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "units_update" ON units
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "units_delete" ON units
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- suppliers  (proveedores)
-- Lectura: admin + panadero | Escritura: admin
-- =====================================================
CREATE POLICY "suppliers_read" ON suppliers
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "suppliers_write" ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "suppliers_delete" ON suppliers
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- supplies  (insumos)
-- Lectura: admin + panadero | Escritura: admin
-- =====================================================
CREATE POLICY "supplies_read" ON supplies
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "supplies_write" ON supplies
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "supplies_update" ON supplies
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "supplies_delete" ON supplies
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- supply_batches  (lotes de insumos)
-- Lectura: admin + panadero | Escritura: solo via RPC (admin)
-- =====================================================
CREATE POLICY "supply_batches_read" ON supply_batches
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "supply_batches_write" ON supply_batches
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "supply_batches_update" ON supply_batches
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "supply_batches_delete" ON supply_batches
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- products  (productos terminados)
-- Lectura: todos | Escritura: admin
-- =====================================================
CREATE POLICY "products_read" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_write" ON products
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "products_update" ON products
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "products_delete" ON products
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- product_recipes  (recetas/BOM)
-- Lectura: admin + panadero | Escritura: admin
-- =====================================================
CREATE POLICY "product_recipes_read" ON product_recipes
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "product_recipes_write" ON product_recipes
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "product_recipes_update" ON product_recipes
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "product_recipes_delete" ON product_recipes
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- production_orders  (órdenes de producción)
-- Lectura: admin + panadero | Escritura: admin + panadero
-- Borrado: solo admin
-- =====================================================
CREATE POLICY "production_orders_read" ON production_orders
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_orders_write" ON production_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_orders_update" ON production_orders
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_orders_delete" ON production_orders
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- production_order_items
-- Lectura: admin + panadero | Escritura: admin + panadero
-- =====================================================
CREATE POLICY "production_order_items_read" ON production_order_items
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_order_items_write" ON production_order_items
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_order_items_update" ON production_order_items
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_order_items_delete" ON production_order_items
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- production_batches  (lotes de productos terminados)
-- Lectura: todos (cajero necesita ver disponibilidad)
-- Escritura: admin + panadero (solo via RPC)
-- =====================================================
CREATE POLICY "production_batches_read" ON production_batches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "production_batches_write" ON production_batches
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_batches_update" ON production_batches
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "production_batches_delete" ON production_batches
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- purchase_orders  (órdenes de compra)
-- Lectura: admin + panadero | Escritura: admin
-- =====================================================
CREATE POLICY "purchase_orders_read" ON purchase_orders
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "purchase_orders_write" ON purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "purchase_orders_update" ON purchase_orders
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "purchase_orders_delete" ON purchase_orders
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- purchase_order_items
-- Lectura: admin + panadero | Escritura: admin
-- =====================================================
CREATE POLICY "purchase_order_items_read" ON purchase_order_items
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "purchase_order_items_write" ON purchase_order_items
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "purchase_order_items_update" ON purchase_order_items
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "purchase_order_items_delete" ON purchase_order_items
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- inventory_movements  (kardex)
-- Lectura: admin + panadero | Escritura: admin + panadero (via RPC)
-- =====================================================
CREATE POLICY "inventory_movements_read" ON inventory_movements
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "inventory_movements_write" ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "inventory_movements_update" ON inventory_movements
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "inventory_movements_delete" ON inventory_movements
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- user_profiles  (perfiles de usuario)
-- Lectura: admin ve todos, otros solo el propio
-- Escritura: solo admin
-- =====================================================
CREATE POLICY "user_profiles_read" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'admin' OR id = auth.uid()
  );

CREATE POLICY "user_profiles_write" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin' OR id = auth.uid())
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR (
      id = auth.uid()
      AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- audit_logs  (solo admin puede ver)
-- =====================================================
CREATE POLICY "audit_logs_read" ON audit_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');


-- =====================================================
-- alerts  (notificaciones del sistema)
-- Lectura: todos | Escritura: admin + panadero
-- =====================================================
CREATE POLICY "alerts_read" ON alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "alerts_write" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'panadero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'panadero'));

CREATE POLICY "alerts_delete" ON alerts
  FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');


-- =====================================================
-- ACTUALIZAR RPC FUNCTIONS: agregar control de rol
-- Reemplaza las funciones del archivo anterior
-- =====================================================

-- receive_purchase_order → solo admin
CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_order_id           UUID,
  p_received_date      DATE,
  p_guia_remision      TEXT,
  p_comprobante_tipo   TEXT,
  p_comprobante_serie  TEXT,
  p_comprobante_numero TEXT,
  p_comprobante_fecha  DATE,
  p_comprobante_monto  DECIMAL,
  p_items              JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item              JSONB;
  v_batch_id          UUID;
  v_supply_id         UUID;
  v_unit_id           UUID;
  v_quantity_received DECIMAL;
  v_unit_price        DECIMAL;
  v_total_cost        DECIMAL;
  v_expiration_date   DATE;
  v_batch_code        TEXT;
  v_order             RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF public.get_user_role() NOT IN ('admin') THEN
    RAISE EXCEPTION 'Se requiere rol admin para recibir órdenes de compra';
  END IF;

  SELECT * INTO v_order FROM purchase_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de compra no encontrada: %', p_order_id; END IF;
  IF v_order.status NOT IN ('pendiente', 'enviado') THEN
    RAISE EXCEPTION 'La orden no puede recibirse en estado "%"', v_order.status;
  END IF;

  UPDATE purchase_orders SET
    status = 'recibido_completo', actual_delivery_date = p_received_date,
    guia_remision = p_guia_remision, comprobante_tipo = p_comprobante_tipo,
    comprobante_serie = p_comprobante_serie, comprobante_numero = p_comprobante_numero,
    comprobante_fecha = p_comprobante_fecha, comprobante_monto = p_comprobante_monto
  WHERE id = p_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_supply_id         := (v_item->>'supply_id')::UUID;
    v_quantity_received := (v_item->>'quantity_received')::DECIMAL;
    v_unit_price        := (v_item->>'unit_price')::DECIMAL;
    v_total_cost        := v_quantity_received * v_unit_price;
    v_batch_code        := v_item->>'batch_code';
    v_expiration_date   := CASE
      WHEN (v_item->>'expiration_date') IS NOT NULL AND (v_item->>'expiration_date') != ''
      THEN (v_item->>'expiration_date')::DATE ELSE NULL END;

    SELECT unit_id INTO v_unit_id FROM supplies WHERE id = v_supply_id;
    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'No se encontró unit_id para el insumo %', v_supply_id;
    END IF;

    INSERT INTO supply_batches (
      supply_id, supplier_id, purchase_order_id, batch_code,
      quantity_received, unit_price, total_cost, expiration_date,
      received_date, current_quantity, status, created_by
    ) VALUES (
      v_supply_id, v_order.supplier_id, p_order_id, v_batch_code,
      v_quantity_received, v_unit_price, v_total_cost, v_expiration_date,
      p_received_date, v_quantity_received, 'disponible', auth.uid()
    ) RETURNING id INTO v_batch_id;

    INSERT INTO inventory_movements (
      movement_type, movement_reason, entity_type, entity_id,
      batch_id, quantity, unit_id, unit_cost, total_cost,
      reference_type, reference_id, notes, movement_date, created_by
    ) VALUES (
      'entrada', 'compra', 'insumo', v_supply_id,
      v_batch_id, v_quantity_received, v_unit_id, v_unit_price, v_total_cost,
      'purchase_order', p_order_id,
      format('Recepción OC %s - GR: %s - %s: %s-%s',
        v_order.order_number, p_guia_remision,
        upper(p_comprobante_tipo), p_comprobante_serie, p_comprobante_numero),
      p_received_date, auth.uid()
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

-- create_purchase_order_with_items → solo admin
CREATE OR REPLACE FUNCTION create_purchase_order_with_items(
  p_supplier_id            UUID,
  p_order_date             DATE,
  p_expected_delivery_date TEXT,
  p_notes                  TEXT,
  p_order_number           TEXT,
  p_subtotal               DECIMAL,
  p_tax                    DECIMAL,
  p_total                  DECIMAL,
  p_items                  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item     JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF public.get_user_role() NOT IN ('admin') THEN
    RAISE EXCEPTION 'Se requiere rol admin para crear órdenes de compra';
  END IF;

  INSERT INTO purchase_orders (
    supplier_id, order_date, expected_delivery_date, notes,
    order_number, subtotal, tax, total, status, created_by
  ) VALUES (
    p_supplier_id, p_order_date,
    NULLIF(p_expected_delivery_date, '')::DATE,
    NULLIF(p_notes, ''),
    p_order_number, p_subtotal, p_tax, p_total, 'pendiente', auth.uid()
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO purchase_order_items (purchase_order_id, supply_id, quantity, unit_price, total)
    VALUES (
      v_order_id,
      (v_item->>'supply_id')::UUID,
      (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total')::DECIMAL
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

-- complete_production_order → admin + panadero
CREATE OR REPLACE FUNCTION complete_production_order(
  p_order_id          UUID,
  p_quantity_produced DECIMAL,
  p_production_date   DATE,
  p_notes             TEXT  DEFAULT NULL,
  p_batch_code        TEXT  DEFAULT NULL,
  p_expiration_date   DATE  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order            RECORD;
  v_ingredient       RECORD;
  v_batch            RECORD;
  v_product_batch_id UUID;
  v_quantity_needed  DECIMAL;
  v_remaining        DECIMAL;
  v_to_consume       DECIMAL;
  v_new_quantity     DECIMAL;
  v_total_cost       DECIMAL := 0;
  v_unit_cost        DECIMAL;
  v_batch_code       TEXT;
  v_expiration_date  DATE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF public.get_user_role() NOT IN ('admin', 'panadero') THEN
    RAISE EXCEPTION 'Se requiere rol admin o panadero para registrar producción';
  END IF;

  SELECT po.*, p.shelf_life_days, p.unit_id AS product_unit_id, p.code AS product_code
  INTO v_order
  FROM production_orders po
  JOIN products p ON p.id = po.product_id
  WHERE po.id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada: %', p_order_id; END IF;
  IF v_order.status != 'programada' THEN
    RAISE EXCEPTION 'La orden no está "programada". Estado actual: %', v_order.status;
  END IF;

  v_batch_code := COALESCE(NULLIF(p_batch_code, ''),
    v_order.product_code || '-' || extract(epoch from clock_timestamp())::bigint::text);
  v_expiration_date := COALESCE(p_expiration_date,
    p_production_date + (v_order.shelf_life_days || ' days')::interval);

  FOR v_ingredient IN
    SELECT pr.supply_id, pr.quantity, pr.unit_id, s.name AS supply_name
    FROM product_recipes pr JOIN supplies s ON s.id = pr.supply_id
    WHERE pr.product_id = v_order.product_id
  LOOP
    v_quantity_needed := v_ingredient.quantity * p_quantity_produced;
    v_remaining       := v_quantity_needed;

    FOR v_batch IN
      SELECT * FROM supply_batches
      WHERE supply_id = v_ingredient.supply_id AND status = 'disponible' AND current_quantity > 0
      ORDER BY expiration_date ASC NULLS LAST, received_date ASC
      FOR UPDATE
    LOOP
      IF v_remaining <= 0 THEN EXIT; END IF;
      v_to_consume   := LEAST(v_remaining, v_batch.current_quantity);
      v_new_quantity := v_batch.current_quantity - v_to_consume;
      v_total_cost   := v_total_cost + (v_to_consume * v_batch.unit_price);

      UPDATE supply_batches SET current_quantity = v_new_quantity WHERE id = v_batch.id;

      INSERT INTO inventory_movements (
        movement_type, movement_reason, entity_type, entity_id,
        batch_id, quantity, unit_id, unit_cost, total_cost,
        reference_type, reference_id, notes, movement_date, created_by
      ) VALUES (
        'salida', 'produccion', 'insumo', v_ingredient.supply_id,
        v_batch.id, v_to_consume, v_ingredient.unit_id,
        v_batch.unit_price, v_to_consume * v_batch.unit_price,
        'production_order', p_order_id,
        format('Consumo FIFO - Orden %s - Lote %s', v_order.order_number, v_batch.batch_code),
        p_production_date, auth.uid()
      );
      v_remaining := v_remaining - v_to_consume;
    END LOOP;

    IF v_remaining > 0.001 THEN
      RAISE EXCEPTION 'Stock insuficiente de %. Faltan %',
        v_ingredient.supply_name, round(v_remaining::numeric, 3);
    END IF;
  END LOOP;

  v_unit_cost := CASE WHEN p_quantity_produced > 0 THEN v_total_cost / p_quantity_produced ELSE 0 END;

  INSERT INTO production_batches (
    product_id, production_order_id, batch_code,
    quantity_produced, current_quantity, production_date, expiration_date,
    unit_cost, total_cost, status
  ) VALUES (
    v_order.product_id, p_order_id, v_batch_code,
    p_quantity_produced, p_quantity_produced, p_production_date, v_expiration_date,
    v_unit_cost, v_total_cost, 'disponible'
  ) RETURNING id INTO v_product_batch_id;

  INSERT INTO inventory_movements (
    movement_type, movement_reason, entity_type, entity_id,
    quantity, unit_id, unit_cost, total_cost,
    reference_type, reference_id, notes, movement_date, created_by
  ) VALUES (
    'entrada', 'produccion', 'producto', v_order.product_id,
    p_quantity_produced, v_order.product_unit_id, v_unit_cost, v_total_cost,
    'production_order', p_order_id,
    format('Producción completada - Orden %s - Lote %s', v_order.order_number, v_batch_code),
    p_production_date, auth.uid()
  );

  UPDATE production_orders SET
    status = 'completada', quantity_produced = p_quantity_produced,
    production_date = p_production_date,
    notes = COALESCE(NULLIF(p_notes, ''), notes)
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true, 'order_id', p_order_id,
    'batch_code', v_batch_code, 'quantity_produced', p_quantity_produced,
    'total_cost', v_total_cost, 'unit_cost', v_unit_cost, 'expiration_date', v_expiration_date
  );
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

-- record_inventory_adjustment → admin + panadero
-- NOTA: versión completa con creación de lotes para ajustes positivos
CREATE OR REPLACE FUNCTION record_inventory_adjustment(
  p_entity_type     TEXT,
  p_entity_id       UUID,
  p_adjustment_type TEXT,
  p_quantity        DECIMAL,
  p_reason          TEXT,
  p_notes           TEXT,
  p_movement_date   DATE,
  p_unit_id         UUID,
  p_unit_price      DECIMAL DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch           RECORD;
  v_remaining       DECIMAL;
  v_to_deduct       DECIMAL;
  v_new_qty         DECIMAL;
  v_total_stock     DECIMAL;
  v_movement_reason movement_reason;
  v_batch_id        UUID;
  v_batch_code      TEXT;
  v_total_cost      DECIMAL;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF public.get_user_role() NOT IN ('admin', 'panadero') THEN
    RAISE EXCEPTION 'Se requiere rol admin o panadero para registrar ajustes';
  END IF;

  v_movement_reason := CASE p_reason
    WHEN 'merma'       THEN 'merma'::movement_reason
    WHEN 'vencimiento' THEN 'vencimiento'::movement_reason
    ELSE 'ajuste_inventario'::movement_reason
  END;

  v_total_cost := p_quantity * COALESCE(p_unit_price, 0);
  v_batch_code := 'AJ-' || to_char(p_movement_date, 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 8);

  -- Verificar stock antes de salida
  IF p_adjustment_type = 'salida' THEN
    IF p_entity_type = 'insumo' THEN
      SELECT COALESCE(SUM(current_quantity), 0) INTO v_total_stock
      FROM supply_batches WHERE supply_id = p_entity_id AND status = 'disponible';
    ELSE
      SELECT COALESCE(SUM(current_quantity), 0) INTO v_total_stock
      FROM production_batches WHERE product_id = p_entity_id AND status = 'disponible';
    END IF;
    IF v_total_stock < p_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_total_stock;
    END IF;
  END IF;

  -- Crear lote para ajustes positivos
  IF p_adjustment_type = 'entrada' THEN
    IF p_entity_type = 'insumo' THEN
      INSERT INTO supply_batches (
        supply_id, batch_code,
        quantity_received, unit_price, total_cost,
        received_date, current_quantity, status, created_by
      ) VALUES (
        p_entity_id, v_batch_code,
        p_quantity, COALESCE(p_unit_price, 0), v_total_cost,
        p_movement_date, p_quantity, 'disponible', auth.uid()
      ) RETURNING id INTO v_batch_id;
    ELSE
      INSERT INTO production_batches (
        product_id, batch_code,
        quantity_produced, current_quantity,
        production_date, unit_cost, total_cost, status
      ) VALUES (
        p_entity_id, v_batch_code,
        p_quantity, p_quantity,
        p_movement_date, COALESCE(p_unit_price, 0), v_total_cost, 'disponible'
      ) RETURNING id INTO v_batch_id;
    END IF;
  END IF;

  -- Registrar en kardex
  INSERT INTO inventory_movements (
    movement_type, movement_reason, entity_type, entity_id,
    batch_id, quantity, unit_id, unit_cost, total_cost,
    notes, movement_date, created_by
  ) VALUES (
    p_adjustment_type::movement_type, v_movement_reason,
    p_entity_type::entity_type, p_entity_id,
    v_batch_id,
    p_quantity, p_unit_id,
    COALESCE(p_unit_price, 0), v_total_cost,
    format('Ajuste - %s: %s', p_reason, COALESCE(NULLIF(p_notes, ''), 'Sin observaciones')),
    p_movement_date, auth.uid()
  );

  -- Descontar FIFO en salidas
  IF p_adjustment_type = 'salida' THEN
    v_remaining := p_quantity;
    IF p_entity_type = 'insumo' THEN
      FOR v_batch IN
        SELECT * FROM supply_batches
        WHERE supply_id = p_entity_id AND status = 'disponible' AND current_quantity > 0
        ORDER BY expiration_date ASC NULLS LAST, received_date ASC FOR UPDATE
      LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;
        v_to_deduct := LEAST(v_remaining, v_batch.current_quantity);
        UPDATE supply_batches SET current_quantity = v_batch.current_quantity - v_to_deduct WHERE id = v_batch.id;
        v_remaining := v_remaining - v_to_deduct;
      END LOOP;
    ELSE
      FOR v_batch IN
        SELECT * FROM production_batches
        WHERE product_id = p_entity_id AND status = 'disponible' AND current_quantity > 0
        ORDER BY production_date ASC FOR UPDATE
      LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;
        v_to_deduct := LEAST(v_remaining, v_batch.current_quantity);
        UPDATE production_batches SET current_quantity = v_batch.current_quantity - v_to_deduct WHERE id = v_batch.id;
        v_remaining := v_remaining - v_to_deduct;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


-- =====================================================
-- AUDIT LOGGING — Triggers automáticos
-- Registra INSERT, UPDATE, DELETE en tablas críticas.
-- =====================================================

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    v_user_id
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar a tablas críticas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'suppliers', 'supplies', 'products', 'product_recipes',
    'purchase_orders', 'production_orders', 'user_profiles'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_%1$s ON %1$s;
       CREATE TRIGGER audit_%1$s
       AFTER INSERT OR UPDATE OR DELETE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();',
      t
    );
  END LOOP;
END;
$$;
