-- =====================================================
-- MIGRACIÓN: empresa_config (tabla singleton)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

CREATE TABLE empresa_config (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identificación legal
  razon_social     TEXT        NOT NULL DEFAULT '',
  nombre_comercial TEXT,
  ruc              TEXT,
  -- Contacto y ubicación
  direccion_fiscal TEXT,
  telefono         TEXT,
  email            TEXT,
  web              TEXT,
  -- Configuración fiscal
  igv              DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  moneda           TEXT        NOT NULL DEFAULT 'PEN',
  -- Branding
  logo_url         TEXT,
  -- Control
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Solo puede existir 1 fila — trigger que lo garantiza
CREATE OR REPLACE FUNCTION prevent_multiple_empresa_config()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM empresa_config) >= 1 THEN
    RAISE EXCEPTION 'Solo puede existir una configuración de empresa';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_singleton_empresa_config
  BEFORE INSERT ON empresa_config
  FOR EACH ROW EXECUTE FUNCTION prevent_multiple_empresa_config();

CREATE TRIGGER update_empresa_config_updated_at
  BEFORE UPDATE ON empresa_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users" ON empresa_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insertar fila inicial con datos de Panificadora Ofelia
INSERT INTO empresa_config (razon_social, ruc, igv, moneda)
VALUES ('Panificadora Ofelia E.I.R.L.', '20452630371', 18.00, 'PEN');
