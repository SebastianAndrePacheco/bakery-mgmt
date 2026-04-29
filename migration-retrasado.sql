-- Migración: marcar órdenes de compra como retrasadas automáticamente
-- Ejecutar en Supabase SQL Editor.

-- 1. Agregar valor 'retrasado' al ENUM (idempotente en Postgres 9.6+)
DO $$ BEGIN
  ALTER TYPE purchase_order_status ADD VALUE 'retrasado';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Función que actualiza órdenes vencidas y retorna el conteo
CREATE OR REPLACE FUNCTION mark_overdue_purchase_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE purchase_orders
  SET
    status     = 'retrasado',
    updated_at = NOW()
  WHERE status IN ('pendiente', 'enviado')
    AND expected_delivery_date IS NOT NULL
    AND expected_delivery_date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 3. Opcional: programar con pg_cron (requiere extensión pg_cron habilitada)
--    En Supabase habilitar desde: Database → Extensions → pg_cron
--    Descomentar para activar:
--
-- SELECT cron.schedule(
--   'mark-overdue-purchase-orders',
--   '0 7 * * *',   -- 7:00 AM UTC diariamente (2:00 AM Lima)
--   'SELECT mark_overdue_purchase_orders()'
-- );
