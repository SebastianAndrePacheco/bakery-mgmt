-- Eliminar el tipo anterior y crear uno nuevo con más estados
ALTER TABLE purchase_orders 
  ALTER COLUMN status DROP DEFAULT;

DROP TYPE IF EXISTS purchase_order_status CASCADE;

CREATE TYPE purchase_order_status AS ENUM (
  'pendiente',
  'enviado', 
  'recibido_completo',
  'recibido_parcial',
  'cancelado',
  'retrasado'
);

ALTER TABLE purchase_orders 
  ALTER COLUMN status TYPE purchase_order_status 
  USING status::text::purchase_order_status;

ALTER TABLE purchase_orders 
  ALTER COLUMN status SET DEFAULT 'pendiente';
