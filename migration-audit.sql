-- ============================================================
-- AUDITORÍA — registro automático de cambios en tablas clave
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 0. Limpiar ejecuciones previas
--    DROP FUNCTION ... CASCADE elimina también los triggers que dependen de ella
DROP FUNCTION IF EXISTS audit_trigger_fn() CASCADE;
DROP TABLE    IF EXISTS audit_logs;

-- 1. Tabla principal de auditoría
CREATE TABLE audit_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name  text        NOT NULL,
  record_id   text        NOT NULL,
  action      text        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid,                  -- auth.users.id (nullable → null = service-role/sistema)
  changed_at  timestamptz DEFAULT now() NOT NULL
);

-- Índices para filtrado rápido
CREATE INDEX audit_logs_table_name_idx  ON audit_logs(table_name);
CREATE INDEX audit_logs_record_id_idx   ON audit_logs(record_id);
CREATE INDEX audit_logs_changed_by_idx  ON audit_logs(changed_by);
CREATE INDEX audit_logs_changed_at_idx  ON audit_logs(changed_at DESC);

-- RLS: solo admins pueden leer; nadie escribe directamente (solo el trigger)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Función trigger (SECURITY DEFINER para poder escribir en audit_logs pese al RLS)
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
      VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Instalar trigger en las tablas clave
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'suppliers',
    'purchase_orders',
    'production_orders',
    'supply_batches',
    'empleados',
    'personas',
    'cargos',
    'user_profiles',
    'empresa_config'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_%I ON %I;
       CREATE TRIGGER audit_%I
         AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();',
      t, t, t, t
    );
  END LOOP;
END;
$$;
