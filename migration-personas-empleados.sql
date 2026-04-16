-- =====================================================
-- MIGRACIÓN: personas, cargos, empleados + suppliers expandido
-- Ejecutar en Supabase SQL Editor
-- =====================================================


-- =====================================================
-- ENUMS NUEVOS
-- =====================================================

CREATE TYPE tipo_documento     AS ENUM ('DNI', 'CE', 'Pasaporte');
CREATE TYPE genero_tipo         AS ENUM ('M', 'F', 'Otro');
CREATE TYPE tipo_contrato_emp   AS ENUM ('indefinido', 'plazo_fijo', 'part_time', 'recibo_honorarios');
CREATE TYPE tipo_cuenta_banco   AS ENUM ('ahorros', 'corriente');


-- =====================================================
-- TABLA: cargos
-- Catálogo de puestos (Panadero, Cajero, Repartidor…)
-- =====================================================

CREATE TABLE cargos (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT    NOT NULL UNIQUE,
  descripcion TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- TABLA: personas
-- Datos de la persona natural.
-- La usan: empleados (hoy), clientes (futuro).
-- =====================================================

CREATE TABLE personas (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_doc         tipo_documento NOT NULL DEFAULT 'DNI',
  numero_doc       TEXT           NOT NULL,
  nombres          TEXT           NOT NULL,
  apellido_paterno TEXT           NOT NULL,
  apellido_materno TEXT,
  fecha_nacimiento DATE,
  genero           genero_tipo,
  telefono         TEXT,
  email            TEXT,
  direccion        TEXT,
  foto_url         TEXT,
  created_at       TIMESTAMPTZ    DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    DEFAULT NOW(),

  -- Dos personas no pueden tener el mismo documento
  UNIQUE (tipo_doc, numero_doc)
);


-- =====================================================
-- TABLA: empleados
-- Vínculo laboral. Une persona + cargo.
-- El acceso al sistema es opcional (user_id puede ser NULL).
-- =====================================================

CREATE TABLE empleados (
  id             UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quién es (datos personales)
  persona_id     UUID                NOT NULL REFERENCES personas(id)    ON DELETE RESTRICT,

  -- Qué cargo ocupa
  cargo_id       UUID                NOT NULL REFERENCES cargos(id)      ON DELETE RESTRICT,

  -- Acceso al sistema (opcional — no todo empleado usa el sistema)
  user_id        UUID                UNIQUE REFERENCES auth.users(id)    ON DELETE SET NULL,

  -- Datos laborales
  fecha_ingreso  DATE                NOT NULL,
  fecha_cese     DATE,
  tipo_contrato  tipo_contrato_emp   NOT NULL DEFAULT 'indefinido',
  sueldo_base    DECIMAL(10, 2),

  -- Datos bancarios (para pago de sueldos)
  banco          TEXT,
  tipo_cuenta    tipo_cuenta_banco,
  numero_cuenta  TEXT,
  cci            TEXT,               -- Código de Cuenta Interbancario (20 dígitos)

  is_active      BOOLEAN             DEFAULT TRUE,
  created_at     TIMESTAMPTZ         DEFAULT NOW(),
  updated_at     TIMESTAMPTZ         DEFAULT NOW()
);


-- =====================================================
-- ALTER: user_profiles
-- Enlace opcional de vuelta al empleado.
-- Permite saber fácilmente si un usuario del sistema
-- tiene un expediente de empleado asociado.
-- =====================================================

ALTER TABLE user_profiles
  ADD COLUMN empleado_id UUID UNIQUE REFERENCES empleados(id) ON DELETE SET NULL;


-- =====================================================
-- ALTER: suppliers
-- Se conservan las columnas existentes para no romper nada.
-- Se agregan columnas nuevas para datos legales y contacto separado.
-- =====================================================

ALTER TABLE suppliers
  -- Datos empresa
  ADD COLUMN nombre_comercial  TEXT,
  ADD COLUMN tipo_proveedor    TEXT,                      -- EIRL, SAC, SRL, SA, persona natural…
  ADD COLUMN estado_sunat      TEXT,                      -- Activo, Baja Provisional…
  ADD COLUMN condicion_sunat   TEXT,                      -- Habido, No Habido…
  ADD COLUMN direccion_fiscal  TEXT,                      -- Dirección fiscal (copia de address o distinta)
  ADD COLUMN telefono_empresa  TEXT,                      -- Tel. central de la empresa
  ADD COLUMN email_empresa     TEXT,                      -- Email corporativo
  ADD COLUMN web               TEXT,

  -- Contacto (persona de trato en la empresa proveedora)
  -- contact_name ya existe — ahora funciona como nombre completo
  ADD COLUMN contact_cargo     TEXT,                      -- Cargo del contacto ("Gerente de ventas")
  ADD COLUMN contact_dni       TEXT,                      -- DNI/CE del contacto
  ADD COLUMN contact_phone     TEXT,                      -- Celular directo del contacto
  ADD COLUMN contact_email     TEXT,                      -- Email directo del contacto
  ADD COLUMN contact_whatsapp  TEXT,

  -- Pago
  ADD COLUMN banco             TEXT,
  ADD COLUMN tipo_cuenta       tipo_cuenta_banco,
  ADD COLUMN numero_cuenta     TEXT,
  ADD COLUMN cci               TEXT,
  ADD COLUMN moneda            TEXT DEFAULT 'PEN';        -- PEN, USD


-- Migrar datos existentes a las nuevas columnas separadas
-- (phone y email se copian a contacto y empresa hasta que el usuario los corrija)
UPDATE suppliers
SET
  direccion_fiscal = address,
  telefono_empresa = phone,
  email_empresa    = email,
  contact_phone    = phone,
  contact_email    = email
WHERE TRUE;


-- =====================================================
-- TRIGGERS: updated_at automático
-- =====================================================

CREATE TRIGGER update_cargos_updated_at
  BEFORE UPDATE ON cargos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_empleados_updated_at
  BEFORE UPDATE ON empleados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE cargos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users" ON cargos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users" ON personas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users" ON empleados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =====================================================
-- ÍNDICES útiles para búsquedas frecuentes
-- =====================================================

CREATE INDEX idx_personas_numero_doc  ON personas (numero_doc);
CREATE INDEX idx_empleados_persona_id ON empleados (persona_id);
CREATE INDEX idx_empleados_cargo_id   ON empleados (cargo_id);
CREATE INDEX idx_empleados_user_id    ON empleados (user_id);
CREATE INDEX idx_empleados_is_active  ON empleados (is_active);
