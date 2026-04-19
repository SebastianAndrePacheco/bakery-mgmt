-- ============================================================
-- Phase 4: Seguridad — registro de accesos
-- ============================================================

-- Tabla de logs de inicio de sesión (para auditoría y bloqueos)
CREATE TABLE IF NOT EXISTS login_logs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      text        NOT NULL,
  ip         text,
  success    boolean     NOT NULL,
  user_id    uuid        REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_email   ON login_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip      ON login_logs(ip);
CREATE INDEX IF NOT EXISTS idx_login_logs_created ON login_logs(created_at DESC);

-- RLS: solo admins pueden leer los logs
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins ven login logs"
  ON login_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Los inserts se hacen con service role desde el servidor (bypasa RLS)
