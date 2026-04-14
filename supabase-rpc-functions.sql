-- =====================================================
-- FUNCIONES RPC PARA OPERACIONES ATÓMICAS
-- Sistema de Gestión de Panadería
--
-- INSTRUCCIONES:
--   Ejecutar este script completo en Supabase > SQL Editor
--   ANTES de desplegar los cambios en los componentes.
--
-- NOTA: Este script asume que la base de datos tiene las
-- columnas adicionales creadas después del schema inicial:
--   purchase_orders : guia_remision, comprobante_tipo,
--                    comprobante_serie, comprobante_numero,
--                    comprobante_fecha, comprobante_monto
--   production_orders : product_id, quantity_planned, quantity_produced
--   production_batches: production_order_id, unit_cost, total_cost
-- =====================================================


-- =====================================================
-- 1. RECIBIR ORDEN DE COMPRA (Atómica)
--    Tablas: purchase_orders + supply_batches + inventory_movements
-- =====================================================
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
  -- Formato de cada elemento en p_items:
  -- {
  --   "supply_id": "uuid",
  --   "batch_code": "string",
  --   "quantity_received": 10.5,
  --   "unit_price": 5.50,
  --   "expiration_date": "2025-12-31" | null | ""
  -- }
  -- unit_id se obtiene automáticamente de la tabla supplies
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

  -- Obtener y bloquear la orden para evitar doble recepción
  SELECT * INTO v_order
  FROM purchase_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de compra no encontrada: %', p_order_id;
  END IF;

  IF v_order.status NOT IN ('pendiente', 'enviado') THEN
    RAISE EXCEPTION 'La orden no puede recibirse en estado "%"', v_order.status;
  END IF;

  -- Actualizar cabecera de la orden
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

  -- Procesar cada ítem
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_supply_id         := (v_item->>'supply_id')::UUID;
    v_quantity_received := (v_item->>'quantity_received')::DECIMAL;
    v_unit_price        := (v_item->>'unit_price')::DECIMAL;
    v_total_cost        := v_quantity_received * v_unit_price;
    v_batch_code        := v_item->>'batch_code';
    v_expiration_date   := CASE
      WHEN (v_item->>'expiration_date') IS NOT NULL
        AND (v_item->>'expiration_date') != ''
      THEN (v_item->>'expiration_date')::DATE
      ELSE NULL
    END;

    -- Obtener unit_id desde supplies (evita el query extra en el frontend)
    SELECT unit_id INTO v_unit_id FROM supplies WHERE id = v_supply_id;
    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'No se encontró unit_id para el insumo %', v_supply_id;
    END IF;

    -- Crear lote de insumo
    INSERT INTO supply_batches (
      supply_id, supplier_id, purchase_order_id, batch_code,
      quantity_received, unit_price, total_cost, expiration_date,
      received_date, current_quantity, status, created_by
    ) VALUES (
      v_supply_id, v_order.supplier_id, p_order_id, v_batch_code,
      v_quantity_received, v_unit_price, v_total_cost, v_expiration_date,
      p_received_date, v_quantity_received, 'disponible', auth.uid()
    ) RETURNING id INTO v_batch_id;

    -- Registrar entrada en kardex
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

GRANT EXECUTE ON FUNCTION receive_purchase_order(
  UUID, DATE, TEXT, TEXT, TEXT, TEXT, DATE, DECIMAL, JSONB
) TO authenticated;


-- =====================================================
-- 2. COMPLETAR ORDEN DE PRODUCCIÓN (Atómica con FIFO)
--    Tablas: supply_batches + inventory_movements (N)
--            + production_batches + inventory_movements
--            + production_orders
-- =====================================================
CREATE OR REPLACE FUNCTION complete_production_order(
  p_order_id          UUID,
  p_quantity_produced DECIMAL,
  p_production_date   DATE,
  p_notes             TEXT    DEFAULT NULL,
  p_batch_code        TEXT    DEFAULT NULL,
  p_expiration_date   DATE    DEFAULT NULL
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Obtener y bloquear la orden de producción
  SELECT
    po.*,
    p.shelf_life_days,
    p.unit_id  AS product_unit_id,
    p.code     AS product_code
  INTO v_order
  FROM production_orders po
  JOIN products p ON p.id = po.product_id
  WHERE po.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de producción no encontrada: %', p_order_id;
  END IF;

  IF v_order.status != 'programada' THEN
    RAISE EXCEPTION 'La orden no está "programada". Estado actual: %', v_order.status;
  END IF;

  -- Generar código de lote si no se proporcionó
  v_batch_code := COALESCE(
    NULLIF(p_batch_code, ''),
    v_order.product_code || '-' || extract(epoch from clock_timestamp())::bigint::text
  );

  -- Calcular fecha de vencimiento si no se proporcionó
  v_expiration_date := COALESCE(
    p_expiration_date,
    p_production_date + (v_order.shelf_life_days || ' days')::interval
  );

  -- ---- FIFO: Consumir ingredientes de la receta ----
  FOR v_ingredient IN
    SELECT pr.supply_id, pr.quantity, pr.unit_id, s.name AS supply_name
    FROM product_recipes pr
    JOIN supplies s ON s.id = pr.supply_id
    WHERE pr.product_id = v_order.product_id
  LOOP
    v_quantity_needed := v_ingredient.quantity * p_quantity_produced;
    v_remaining       := v_quantity_needed;

    -- Iterar lotes en orden FIFO (más próximo a vencer primero)
    FOR v_batch IN
      SELECT *
      FROM supply_batches
      WHERE supply_id = v_ingredient.supply_id
        AND status = 'disponible'
        AND current_quantity > 0
      ORDER BY
        expiration_date ASC NULLS LAST,
        received_date   ASC
      FOR UPDATE  -- evita race condition con producciones concurrentes
    LOOP
      IF v_remaining <= 0 THEN EXIT; END IF;

      v_to_consume   := LEAST(v_remaining, v_batch.current_quantity);
      v_new_quantity := v_batch.current_quantity - v_to_consume;

      -- Acumular costo real de los lotes consumidos
      v_total_cost := v_total_cost + (v_to_consume * v_batch.unit_price);

      -- Actualizar lote (trigger update_batch_status actualiza status automáticamente)
      UPDATE supply_batches
      SET current_quantity = v_new_quantity
      WHERE id = v_batch.id;

      -- Registrar salida en kardex por cada lote consumido
      INSERT INTO inventory_movements (
        movement_type, movement_reason, entity_type, entity_id,
        batch_id, quantity, unit_id, unit_cost, total_cost,
        reference_type, reference_id, notes, movement_date, created_by
      ) VALUES (
        'salida', 'produccion', 'insumo', v_ingredient.supply_id,
        v_batch.id, v_to_consume, v_ingredient.unit_id,
        v_batch.unit_price, v_to_consume * v_batch.unit_price,
        'production_order', p_order_id,
        format('Consumo FIFO - Orden %s - Lote %s',
               v_order.order_number, v_batch.batch_code),
        p_production_date, auth.uid()
      );

      v_remaining := v_remaining - v_to_consume;
    END LOOP;

    -- Tolerancia de 0.001 para errores de punto flotante
    IF v_remaining > 0.001 THEN
      RAISE EXCEPTION 'Stock insuficiente de %. Faltan %',
        v_ingredient.supply_name, round(v_remaining::numeric, 3);
    END IF;
  END LOOP;

  -- Costo unitario real (calculado de los lotes FIFO consumidos)
  v_unit_cost := CASE
    WHEN p_quantity_produced > 0 THEN v_total_cost / p_quantity_produced
    ELSE 0
  END;

  -- Crear lote de producto terminado
  INSERT INTO production_batches (
    product_id, production_order_id, batch_code,
    quantity_produced, current_quantity,
    production_date, expiration_date,
    unit_cost, total_cost, status
  ) VALUES (
    v_order.product_id, p_order_id, v_batch_code,
    p_quantity_produced, p_quantity_produced,
    p_production_date, v_expiration_date,
    v_unit_cost, v_total_cost, 'disponible'
  ) RETURNING id INTO v_product_batch_id;

  -- Registrar entrada de producto en kardex
  INSERT INTO inventory_movements (
    movement_type, movement_reason, entity_type, entity_id,
    quantity, unit_id, unit_cost, total_cost,
    reference_type, reference_id, notes, movement_date, created_by
  ) VALUES (
    'entrada', 'produccion', 'producto', v_order.product_id,
    p_quantity_produced, v_order.product_unit_id,
    v_unit_cost, v_total_cost,
    'production_order', p_order_id,
    format('Producción completada - Orden %s - Lote %s',
           v_order.order_number, v_batch_code),
    p_production_date, auth.uid()
  );

  -- Marcar la orden como completada
  UPDATE production_orders SET
    status            = 'completada',
    quantity_produced = p_quantity_produced,
    production_date   = p_production_date,
    notes             = COALESCE(NULLIF(p_notes, ''), notes)
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success',           true,
    'order_id',          p_order_id,
    'batch_code',        v_batch_code,
    'quantity_produced', p_quantity_produced,
    'total_cost',        v_total_cost,
    'unit_cost',         v_unit_cost,
    'expiration_date',   v_expiration_date
  );
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_production_order(
  UUID, DECIMAL, DATE, TEXT, TEXT, DATE
) TO authenticated;


-- =====================================================
-- 3. CREAR ORDEN DE COMPRA CON ÍTEMS (Atómica)
--    Tablas: purchase_orders + purchase_order_items
-- =====================================================
CREATE OR REPLACE FUNCTION create_purchase_order_with_items(
  p_supplier_id            UUID,
  p_order_date             DATE,
  p_expected_delivery_date TEXT,  -- TEXT para manejar string vacío
  p_notes                  TEXT,
  p_order_number           TEXT,
  p_subtotal               DECIMAL,
  p_tax                    DECIMAL,
  p_total                  DECIMAL,
  p_items                  JSONB
  -- Formato de cada elemento en p_items:
  -- { "supply_id": "uuid", "quantity": 10, "unit_price": 5.50, "total": 55.00 }
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

  -- Crear cabecera de la orden
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

  -- Crear ítems en el mismo bloque atómico
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO purchase_order_items (
      purchase_order_id, supply_id, quantity, unit_price, total
    ) VALUES (
      v_order_id,
      (v_item->>'supply_id')::UUID,
      (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total')::DECIMAL
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_purchase_order_with_items(
  UUID, DATE, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, JSONB
) TO authenticated;


-- =====================================================
-- MIGRATION: Permitir ajustes de inventario sin proveedor
-- Hacer supplier_id nullable en supply_batches para soportar
-- lotes creados por ajuste manual (sin orden de compra).
-- =====================================================
ALTER TABLE supply_batches ALTER COLUMN supplier_id DROP NOT NULL;


-- =====================================================
-- 4. REGISTRAR AJUSTE DE INVENTARIO (Atómico)
--    Tablas: inventory_movements + supply_batches / production_batches
--
-- Ajustes positivos ('entrada'): crea un nuevo lote en supply_batches
--   o production_batches y registra en el kardex.
-- Ajustes negativos ('salida'): descuenta de lotes FIFO y registra
--   en el kardex.
-- =====================================================
CREATE OR REPLACE FUNCTION record_inventory_adjustment(
  p_entity_type     TEXT,     -- 'insumo' | 'producto'
  p_entity_id       UUID,
  p_adjustment_type TEXT,     -- 'entrada' | 'salida'
  p_quantity        DECIMAL,
  p_reason          TEXT,     -- 'merma' | 'vencimiento' | 'correccion' | 'robo' | 'otro'
  p_notes           TEXT,
  p_movement_date   DATE,
  p_unit_id         UUID,
  p_unit_price      DECIMAL DEFAULT 0  -- costo unitario para ajustes positivos
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Mapear motivo de formulario al ENUM de BD
  v_movement_reason := CASE p_reason
    WHEN 'merma'      THEN 'merma'::movement_reason
    WHEN 'vencimiento' THEN 'vencimiento'::movement_reason
    ELSE 'ajuste_inventario'::movement_reason
  END;

  v_total_cost := p_quantity * COALESCE(p_unit_price, 0);
  v_batch_code := 'AJ-' || to_char(p_movement_date, 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 8);

  -- Verificar stock disponible antes de registrar salida
  IF p_adjustment_type = 'salida' THEN
    IF p_entity_type = 'insumo' THEN
      SELECT COALESCE(SUM(current_quantity), 0) INTO v_total_stock
      FROM supply_batches
      WHERE supply_id = p_entity_id AND status = 'disponible';
    ELSE
      SELECT COALESCE(SUM(current_quantity), 0) INTO v_total_stock
      FROM production_batches
      WHERE product_id = p_entity_id AND status = 'disponible';
    END IF;

    IF v_total_stock < p_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_total_stock;
    END IF;
  END IF;

  -- Para ajustes positivos: crear lote de stock
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

  -- Registrar movimiento en kardex
  INSERT INTO inventory_movements (
    movement_type, movement_reason, entity_type, entity_id,
    batch_id, quantity, unit_id, unit_cost, total_cost,
    notes, movement_date, created_by
  ) VALUES (
    p_adjustment_type::movement_type,
    v_movement_reason,
    p_entity_type::entity_type,
    p_entity_id,
    v_batch_id,
    p_quantity, p_unit_id,
    COALESCE(p_unit_price, 0), v_total_cost,
    format('Ajuste - %s: %s', p_reason, COALESCE(NULLIF(p_notes, ''), 'Sin observaciones')),
    p_movement_date, auth.uid()
  );

  -- Descontar de lotes FIFO solo en salidas
  IF p_adjustment_type = 'salida' THEN
    v_remaining := p_quantity;

    IF p_entity_type = 'insumo' THEN
      FOR v_batch IN
        SELECT * FROM supply_batches
        WHERE supply_id = p_entity_id
          AND status = 'disponible'
          AND current_quantity > 0
        ORDER BY expiration_date ASC NULLS LAST, received_date ASC
        FOR UPDATE
      LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;
        v_to_deduct := LEAST(v_remaining, v_batch.current_quantity);
        v_new_qty   := v_batch.current_quantity - v_to_deduct;
        UPDATE supply_batches SET current_quantity = v_new_qty WHERE id = v_batch.id;
        v_remaining := v_remaining - v_to_deduct;
      END LOOP;
    ELSE
      FOR v_batch IN
        SELECT * FROM production_batches
        WHERE product_id = p_entity_id
          AND status = 'disponible'
          AND current_quantity > 0
        ORDER BY production_date ASC
        FOR UPDATE
      LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;
        v_to_deduct := LEAST(v_remaining, v_batch.current_quantity);
        v_new_qty   := v_batch.current_quantity - v_to_deduct;
        UPDATE production_batches SET current_quantity = v_new_qty WHERE id = v_batch.id;
        v_remaining := v_remaining - v_to_deduct;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION record_inventory_adjustment(
  TEXT, UUID, TEXT, DECIMAL, TEXT, TEXT, DATE, UUID, DECIMAL
) TO authenticated;
