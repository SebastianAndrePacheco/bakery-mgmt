-- ============================================================
-- Phase 5: Consolidar roles — eliminar 'panadero', unificar en 'cajero'
-- El acceso granular ahora lo maneja cargo_permisos, no el rol.
-- ============================================================

-- ─── 1. Migrar datos ─────────────────────────────────────────────────────────
UPDATE user_profiles SET role = 'cajero' WHERE role = 'panadero';

-- ─── 2. Recrear el enum sin 'panadero' ───────────────────────────────────────
-- Eliminar dinámicamente TODAS las políticas que referencian user_profiles.role
-- (puede haber políticas en cualquier tabla con subqueries directos a esa columna)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT p.polname, c.relname
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_depend d ON d.objid = p.oid
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    JOIN pg_class tc ON tc.oid = d.refobjid
    WHERE tc.relname = 'user_profiles' AND a.attname = 'role'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.polname, r.relname);
    RAISE NOTICE 'Dropped policy % on %', r.polname, r.relname;
  END LOOP;
END;
$$;

CREATE TYPE user_role_new AS ENUM ('admin', 'cajero');

ALTER TABLE user_profiles
  ALTER COLUMN role TYPE user_role_new
  USING role::text::user_role_new;

DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Recrear todas las políticas dropeadas usando get_user_role() (sin dependencia directa a la columna)

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin' OR id = auth.uid())
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR (
      id = auth.uid()
      AND role = (SELECT up.role FROM user_profiles up WHERE up.id = auth.uid())
    )
  );

CREATE POLICY "audit_logs_read" ON audit_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Admins ven login logs" ON login_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "cargo_permisos_admin_write" ON cargo_permisos
  FOR ALL USING (public.get_user_role() = 'admin');

-- ─── 3. Actualizar políticas RLS que verificaban 'panadero' ──────────────────

-- suppliers
DROP POLICY IF EXISTS "suppliers_read" ON suppliers;
CREATE POLICY "suppliers_read" ON suppliers
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));

-- supplies
DROP POLICY IF EXISTS "supplies_read" ON supplies;
CREATE POLICY "supplies_read" ON supplies
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));

-- supply_batches
DROP POLICY IF EXISTS "supply_batches_read"   ON supply_batches;
DROP POLICY IF EXISTS "supply_batches_update" ON supply_batches;
CREATE POLICY "supply_batches_read" ON supply_batches
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "supply_batches_update" ON supply_batches
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));

-- product_recipes
DROP POLICY IF EXISTS "product_recipes_read" ON product_recipes;
CREATE POLICY "product_recipes_read" ON product_recipes
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));

-- production_orders
DROP POLICY IF EXISTS "production_orders_read"   ON production_orders;
DROP POLICY IF EXISTS "production_orders_write"  ON production_orders;
DROP POLICY IF EXISTS "production_orders_update" ON production_orders;
CREATE POLICY "production_orders_read" ON production_orders
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "production_orders_write" ON production_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "production_orders_update" ON production_orders
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));

-- production_order_items
DROP POLICY IF EXISTS "production_order_items_read"   ON production_order_items;
DROP POLICY IF EXISTS "production_order_items_write"  ON production_order_items;
DROP POLICY IF EXISTS "production_order_items_update" ON production_order_items;
CREATE POLICY "production_order_items_read" ON production_order_items
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "production_order_items_write" ON production_order_items
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "production_order_items_update" ON production_order_items
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));

-- production_batches
DROP POLICY IF EXISTS "production_batches_write"  ON production_batches;
DROP POLICY IF EXISTS "production_batches_update" ON production_batches;
CREATE POLICY "production_batches_write" ON production_batches
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "production_batches_update" ON production_batches
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));

-- purchase_orders
DROP POLICY IF EXISTS "purchase_orders_read" ON purchase_orders;
CREATE POLICY "purchase_orders_read" ON purchase_orders
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));

-- purchase_order_items
DROP POLICY IF EXISTS "purchase_order_items_read" ON purchase_order_items;
CREATE POLICY "purchase_order_items_read" ON purchase_order_items
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));

-- inventory_movements
DROP POLICY IF EXISTS "inventory_movements_read"  ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_write" ON inventory_movements;
CREATE POLICY "inventory_movements_read" ON inventory_movements
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "inventory_movements_write" ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));

-- alerts
DROP POLICY IF EXISTS "alerts_write"  ON alerts;
DROP POLICY IF EXISTS "alerts_update" ON alerts;
CREATE POLICY "alerts_write" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));
CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'cajero'))
  WITH CHECK (public.get_user_role() IN ('admin', 'cajero'));

-- ─── 4. Actualizar funciones RPC ─────────────────────────────────────────────

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
  IF public.get_user_role() NOT IN ('admin', 'cajero') THEN
    RAISE EXCEPTION 'Se requiere permiso para registrar producción';
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
  IF public.get_user_role() NOT IN ('admin', 'cajero') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere permiso para registrar ajustes';
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
