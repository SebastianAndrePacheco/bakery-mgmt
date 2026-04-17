-- ============================================================
-- Phase 2: IGV diferenciado, correlativos, categoría proveedor
-- ============================================================

-- 1. IGV diferenciado en insumos
--    afecto_igv = true  → precio incluye IGV 18%  (default)
--    afecto_igv = false → insumo exonerado de IGV
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS afecto_igv boolean NOT NULL DEFAULT true;

-- 2. Tabla de correlativos de comprobantes
--    Guarda el último número usado por tipo + serie para sugerir el siguiente
CREATE TABLE IF NOT EXISTS comprobante_correlativos (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo          text    NOT NULL,
  serie         text    NOT NULL,
  ultimo_numero integer NOT NULL DEFAULT 0,
  UNIQUE (tipo, serie)
);

INSERT INTO comprobante_correlativos (tipo, serie, ultimo_numero) VALUES
  ('factura', 'F001', 0),
  ('boleta',  'B001', 0),
  ('ticket',  'T001', 0),
  ('recibo',  'R001', 0)
ON CONFLICT DO NOTHING;

-- 3. Categoría de suministro en proveedores
--    Permite clasificar qué tipo de insumos provee cada proveedor
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS categoria_suministro text;
