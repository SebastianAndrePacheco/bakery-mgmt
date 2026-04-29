-- Migración: expandir permisos de módulo padre → sub-módulos
-- Ejecutar en Supabase SQL Editor.
-- Los cargos que tenían acceso a un módulo completo reciben TODOS sus sub-módulos.

BEGIN;

-- COMPRAS → 4 sub-módulos
INSERT INTO cargo_permisos (cargo_id, modulo)
SELECT cargo_id, sub
FROM cargo_permisos
CROSS JOIN (VALUES
  ('compras.proveedores'),
  ('compras.ordenes'),
  ('compras.ordenes.crear'),
  ('compras.ordenes.recibir')
) AS subs(sub)
WHERE modulo = 'compras'
ON CONFLICT DO NOTHING;

-- INVENTARIO → 4 sub-módulos
INSERT INTO cargo_permisos (cargo_id, modulo)
SELECT cargo_id, sub
FROM cargo_permisos
CROSS JOIN (VALUES
  ('inventario.insumos'),
  ('inventario.ajustes'),
  ('inventario.kardex'),
  ('inventario.terminados')
) AS subs(sub)
WHERE modulo = 'inventario'
ON CONFLICT DO NOTHING;

-- PRODUCCIÓN → 4 sub-módulos
INSERT INTO cargo_permisos (cargo_id, modulo)
SELECT cargo_id, sub
FROM cargo_permisos
CROSS JOIN (VALUES
  ('produccion.productos'),
  ('produccion.ordenes'),
  ('produccion.ordenes.crear'),
  ('produccion.ordenes.completar')
) AS subs(sub)
WHERE modulo = 'produccion'
ON CONFLICT DO NOTHING;

-- REPORTES → 3 sub-módulos
INSERT INTO cargo_permisos (cargo_id, modulo)
SELECT cargo_id, sub
FROM cargo_permisos
CROSS JOIN (VALUES
  ('reportes.compras'),
  ('reportes.inventario'),
  ('reportes.produccion')
) AS subs(sub)
WHERE modulo = 'reportes'
ON CONFLICT DO NOTHING;

-- Eliminar los permisos de módulo padre (ya reemplazados por sub-módulos)
DELETE FROM cargo_permisos
WHERE modulo IN ('compras', 'inventario', 'produccion', 'reportes');

COMMIT;
