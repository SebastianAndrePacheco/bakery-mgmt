-- ============================================================
-- CARGO PERMISOS — módulos accesibles por cargo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS cargo_permisos (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_id   uuid NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  modulo     text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cargo_id, modulo)
);

CREATE INDEX IF NOT EXISTS cargo_permisos_cargo_id_idx ON cargo_permisos(cargo_id);

ALTER TABLE cargo_permisos ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer (el sidebar lo necesita)
CREATE POLICY "cargo_permisos_read" ON cargo_permisos
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admin puede escribir
CREATE POLICY "cargo_permisos_admin_write" ON cargo_permisos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
