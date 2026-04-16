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
-- (evita que TRUNCATE empleados cascade a user_profiles)
UPDATE user_profiles SET empleado_id = NULL WHERE empleado_id IS NOT NULL;

-- Tablas operativas sin CASCADE para no arrastrar user_profiles
-- El orden importa: primero hojas, luego raíces
TRUNCATE TABLE audit_logs                RESTART IDENTITY;
TRUNCATE TABLE inventory_movements       RESTART IDENTITY;
TRUNCATE TABLE production_batches        RESTART IDENTITY;
TRUNCATE TABLE production_order_items    RESTART IDENTITY;
TRUNCATE TABLE production_orders         RESTART IDENTITY;
TRUNCATE TABLE purchase_order_items      RESTART IDENTITY;
TRUNCATE TABLE purchase_orders           RESTART IDENTITY;
TRUNCATE TABLE supply_batches            RESTART IDENTITY;
TRUNCATE TABLE supplies                  RESTART IDENTITY;
TRUNCATE TABLE products                  RESTART IDENTITY;
TRUNCATE TABLE categories                RESTART IDENTITY;
TRUNCATE TABLE units                     RESTART IDENTITY;
TRUNCATE TABLE suppliers                 RESTART IDENTITY;
TRUNCATE TABLE empleados                 RESTART IDENTITY;
TRUNCATE TABLE personas                  RESTART IDENTITY;
TRUNCATE TABLE cargos                    RESTART IDENTITY;

-- Empresa config: vuelve al estado inicial
TRUNCATE TABLE empresa_config RESTART IDENTITY CASCADE;
INSERT INTO empresa_config (razon_social, ruc, igv, moneda)
VALUES ('Panificadora Ofelia E.I.R.L.', '20452630371', 18, 'PEN');

-- Reactiva triggers y FK checks
SET LOCAL session_replication_role = DEFAULT;

COMMIT;
