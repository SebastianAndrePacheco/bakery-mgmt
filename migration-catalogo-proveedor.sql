-- Migración: catálogo de empaques por proveedor-insumo
-- Ejecutar en Supabase SQL Editor.
-- Permite registrar que un proveedor vende un insumo en "cajas de 12 L"
-- y que la OC muestre "2 cajas" mientras el inventario registra "24 L".

-- ─────────────────────────────────────────────────────────────
-- 1. Tabla catálogo proveedor-insumo
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_supply_catalog (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id)  ON DELETE CASCADE,
  supply_id         UUID NOT NULL REFERENCES supplies(id)   ON DELETE CASCADE,
  purchase_unit     TEXT NOT NULL,                      -- "Caja", "Saco", "Garrafa", etc.
  units_per_package DECIMAL(10,3) NOT NULL CHECK (units_per_package > 0),
  default_price     DECIMAL(10,2),                      -- precio por empaque (pre-rellena la OC)
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (supplier_id, supply_id)
);

ALTER TABLE supplier_supply_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users" ON supplier_supply_catalog
  FOR ALL TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────
-- 2. Campos de empaque en purchase_order_items
--    quantity sigue siendo la unidad de stock (ej. litros)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS package_quantity    DECIMAL(10,3),  -- cajas ordenadas
  ADD COLUMN IF NOT EXISTS purchase_unit       TEXT,           -- "Caja"
  ADD COLUMN IF NOT EXISTS units_per_package   DECIMAL(10,3);  -- 12 L/caja

-- ─────────────────────────────────────────────────────────────
-- 3. Actualizar RPC create_purchase_order_with_items
--    para guardar los campos de empaque
-- ─────────────────────────────────────────────────────────────
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
  -- Campos por ítem (quantity = stock units; package_* opcionales):
  -- { "supply_id", "quantity", "unit_price", "total",
  --   "package_quantity"?, "purchase_unit"?, "units_per_package"? }
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF public.get_user_role() NOT IN ('admin') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol administrador';
  END IF;

  INSERT INTO purchase_orders (
    supplier_id, order_date, expected_delivery_date, notes,
    order_number, subtotal, tax, total, status, created_by
  ) VALUES (
    p_supplier_id,
    p_order_date,
    NULLIF(p_expected_delivery_date, '')::DATE,
    NULLIF(p_notes, ''),
    p_order_number,
    p_subtotal, p_tax, p_total,
    'pendiente', auth.uid()
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO purchase_order_items (
      purchase_order_id, supply_id, quantity, unit_price, total,
      package_quantity, purchase_unit, units_per_package
    ) VALUES (
      v_order_id,
      (v_item->>'supply_id')::UUID,
      (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total')::DECIMAL,
      NULLIF(v_item->>'package_quantity', '')::DECIMAL,
      NULLIF(v_item->>'purchase_unit', ''),
      NULLIF(v_item->>'units_per_package', '')::DECIMAL
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Actualizar receive_purchase_order para aceptar 'retrasado'
-- ─────────────────────────────────────────────────────────────
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF public.get_user_role() NOT IN ('admin') THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere rol administrador';
  END IF;

  SELECT * INTO v_order FROM purchase_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de compra no encontrada: %', p_order_id;
  END IF;

  -- Acepta también 'retrasado' además de 'pendiente'/'enviado'
  IF v_order.status NOT IN ('pendiente', 'enviado', 'retrasado') THEN
    RAISE EXCEPTION 'La orden no puede recibirse en estado "%"', v_order.status;
  END IF;

  UPDATE purchase_orders SET
    status               = 'recibido_completo',
    actual_delivery_date = p_received_date,
    guia_remision        = p_guia_remision,
    comprobante_tipo     = p_comprobante_tipo,
    comprobante_serie    = p_comprobante_serie,
    comprobante_numero   = p_comprobante_numero,
    comprobante_fecha    = p_comprobante_fecha,
    comprobante_monto    = p_comprobante_monto
  WHERE id = p_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_supply_id         := (v_item->>'supply_id')::UUID;
    v_quantity_received := (v_item->>'quantity_received')::DECIMAL;
    v_unit_price        := (v_item->>'unit_price')::DECIMAL;
    v_total_cost        := v_quantity_received * v_unit_price;
    v_batch_code        := v_item->>'batch_code';
    v_expiration_date   := CASE
      WHEN (v_item->>'expiration_date') IS NOT NULL AND (v_item->>'expiration_date') != ''
      THEN (v_item->>'expiration_date')::DATE
      ELSE NULL
    END;

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
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;
