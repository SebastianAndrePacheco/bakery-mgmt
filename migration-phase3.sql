-- ============================================================
-- Phase 3: Flujo de aprobación de órdenes de compra
-- ============================================================

-- Tabla de historial de aprobaciones
CREATE TABLE IF NOT EXISTS purchase_order_approvals (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id   uuid        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  action              text        NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'cancelled', 'sent')),
  comment             text,
  created_by          uuid        REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poa_order ON purchase_order_approvals(purchase_order_id);

-- RLS: solo admins y el creador pueden ver el historial
ALTER TABLE purchase_order_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins ven todo en aprobaciones"
  ON purchase_order_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Usuarios ven sus propias aprobaciones"
  ON purchase_order_approvals FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Usuarios autenticados pueden insertar aprobaciones"
  ON purchase_order_approvals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- NOTA: Los nuevos valores de status ('borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado')
-- se validan a nivel de aplicación. Si tu columna status tiene un CHECK constraint,
-- ejecuta también esto en el SQL editor de Supabase:
--
-- ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
-- ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
--   CHECK (status IN ('borrador','pendiente_aprobacion','aprobado','rechazado',
--                     'enviado','recibido_completo','recibido_parcial','cancelado','retrasado'));
