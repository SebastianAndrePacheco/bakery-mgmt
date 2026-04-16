-- ============================================================
-- RESET DE DATOS — borra registros operativos, conserva usuarios
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Conserva: auth.users, user_profiles (el admin sigue funcionando)
-- Borra: todo el dato operativo (inventario, compras, producción,
--        empleados, proveedores, auditoría, configuración de empresa)
-- ============================================================

BEGIN;

-- Desactiva triggers y FK checks para poder truncar en cualquier orden
-- (evita que audit_trigger_fn registre miles de DELETEs innecesarios)
SET LOCAL session_replication_role = replica;

-- Desconectar FK de user_profiles → empleados antes de borrar empleados
UPDATE user_profiles SET empleado_id = NULL WHERE empleado_id IS NOT NULL;

-- Tablas operativas — orden aproximado de hoja a raíz (con replica-role
-- no es estrictamente necesario pero queda documentado)
TRUNCATE TABLE
  audit_logs,
  inventory_movements,
  production_batches,
  production_order_items,
  production_orders,
  purchase_order_items,
  purchase_orders,
  supply_batches,
  supplies,
  products,
  categories,
  units,
  suppliers,
  empleados,
  personas,
  cargos
RESTART IDENTITY CASCADE;

-- Empresa config: vuelve al estado inicial
TRUNCATE TABLE empresa_config RESTART IDENTITY CASCADE;
INSERT INTO empresa_config (razon_social, ruc, igv, moneda)
VALUES ('Panificadora Ofelia E.I.R.L.', '20452630371', 18, 'PEN');

-- Reactiva triggers y FK checks
SET LOCAL session_replication_role = DEFAULT;

COMMIT;
