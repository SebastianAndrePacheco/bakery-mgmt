-- =====================================================
-- SISTEMA DE GESTIÓN DE PANADERÍA
-- Schema completo para Supabase
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS (Tipos personalizados)
-- =====================================================

CREATE TYPE category_type AS ENUM ('insumo', 'producto');
CREATE TYPE unit_type AS ENUM ('peso', 'volumen', 'unidad');
CREATE TYPE user_role AS ENUM ('admin', 'panadero', 'cajero');
CREATE TYPE batch_status AS ENUM ('disponible', 'agotado', 'vencido');
CREATE TYPE production_status AS ENUM ('programada', 'en_proceso', 'completada', 'cancelada');
CREATE TYPE production_order_type AS ENUM ('programada', 'especial');
CREATE TYPE purchase_order_status AS ENUM ('pendiente', 'enviado', 'recibido', 'cancelado');
CREATE TYPE movement_type AS ENUM ('entrada', 'salida', 'ajuste');
CREATE TYPE movement_reason AS ENUM (
  'compra', 
  'produccion', 
  'merma', 
  'vencimiento',
  'ajuste_inventario',
  'devolucion_proveedor',
  'venta_manual'
);
CREATE TYPE entity_type AS ENUM ('insumo', 'producto');
CREATE TYPE alert_type AS ENUM ('stock_minimo', 'vencimiento_proximo', 'vencido', 'produccion_pendiente');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

-- =====================================================
-- TABLAS MAESTRAS
-- =====================================================

-- Categorías de insumos y productos
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type category_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unidades de medida
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  type unit_type NOT NULL,
  base_unit_id UUID REFERENCES units(id),
  conversion_factor DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_conversion_logic CHECK (
    (base_unit_id IS NULL AND conversion_factor IS NULL) OR
    (base_unit_id IS NOT NULL AND conversion_factor IS NOT NULL AND conversion_factor > 0)
  )
);

-- Proveedores
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  ruc TEXT UNIQUE,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MÓDULO: INVENTARIO DE INSUMOS
-- =====================================================

-- Maestro de insumos
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  min_stock DECIMAL(10, 3) NOT NULL DEFAULT 0,
  storage_conditions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_min_stock_positive CHECK (min_stock >= 0)
);

-- Lotes de insumos (FIFO)
CREATE TABLE supply_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supply_id UUID NOT NULL REFERENCES supplies(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  purchase_order_id UUID,
  batch_code TEXT NOT NULL,
  quantity_received DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  manufacturing_date DATE,
  expiration_date DATE,
  received_date DATE NOT NULL,
  current_quantity DECIMAL(10, 3) NOT NULL,
  status batch_status DEFAULT 'disponible',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_quantities CHECK (
    quantity_received > 0 AND 
    current_quantity >= 0 AND 
    current_quantity <= quantity_received
  ),
  CONSTRAINT check_costs CHECK (unit_price >= 0 AND total_cost >= 0)
);

-- Índice para FIFO (ordenar por fecha de vencimiento y recepción)
CREATE INDEX idx_supply_batches_fifo 
ON supply_batches(supply_id, expiration_date NULLS LAST, received_date) 
WHERE status = 'disponible';

-- =====================================================
-- MÓDULO: PRODUCCIÓN
-- =====================================================

-- Productos terminados
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  shelf_life_days INTEGER NOT NULL DEFAULT 1,
  selling_price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_shelf_life CHECK (shelf_life_days > 0),
  CONSTRAINT check_selling_price CHECK (selling_price IS NULL OR selling_price >= 0)
);

-- Recetas de productos (BOM - Bill of Materials)
CREATE TABLE product_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES supplies(id),
  quantity DECIMAL(10, 3) NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_recipe_quantity CHECK (quantity > 0),
  CONSTRAINT unique_product_supply UNIQUE(product_id, supply_id)
);

-- Órdenes de producción
CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  order_type production_order_type NOT NULL,
  scheduled_date DATE NOT NULL,
  production_date DATE,
  status production_status DEFAULT 'programada',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ítems de órdenes de producción
CREATE TABLE production_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  planned_quantity DECIMAL(10, 3) NOT NULL,
  produced_quantity DECIMAL(10, 3),
  rejected_quantity DECIMAL(10, 3) DEFAULT 0,
  batch_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_production_quantities CHECK (
    planned_quantity > 0 AND
    (produced_quantity IS NULL OR produced_quantity >= 0) AND
    rejected_quantity >= 0
  )
);

-- Lotes de productos terminados
CREATE TABLE production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  production_order_item_id UUID REFERENCES production_order_items(id),
  batch_code TEXT NOT NULL UNIQUE,
  quantity_produced DECIMAL(10, 3) NOT NULL,
  current_quantity DECIMAL(10, 3) NOT NULL,
  production_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  production_cost DECIMAL(10, 2),
  status batch_status DEFAULT 'disponible',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_batch_quantities CHECK (
    quantity_produced > 0 AND
    current_quantity >= 0 AND
    current_quantity <= quantity_produced
  )
);

-- =====================================================
-- MÓDULO: COMPRAS
-- =====================================================

-- Órdenes de compra
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status purchase_order_status DEFAULT 'pendiente',
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_purchase_amounts CHECK (
    subtotal >= 0 AND tax >= 0 AND total >= 0
  )
);

-- Ítems de órdenes de compra
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES supplies(id),
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_item_amounts CHECK (
    quantity > 0 AND unit_price >= 0 AND total >= 0
  )
);

-- =====================================================
-- MÓDULO: KARDEX/MOVIMIENTOS
-- =====================================================

-- Movimientos de inventario (Kardex unificado)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movement_type movement_type NOT NULL,
  movement_reason movement_reason NOT NULL,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  batch_id UUID,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id),
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  movement_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_movement_quantity CHECK (quantity != 0)
);

-- Índice para consultas rápidas de kardex
CREATE INDEX idx_inventory_movements_entity 
ON inventory_movements(entity_type, entity_id, movement_date DESC);

CREATE INDEX idx_inventory_movements_batch
ON inventory_movements(batch_id) WHERE batch_id IS NOT NULL;

-- =====================================================
-- MÓDULO: USUARIOS Y AUDITORÍA
-- =====================================================

-- Perfiles de usuario
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auditoría de cambios
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MÓDULO: ALERTAS
-- =====================================================

-- Alertas del sistema
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_by UUID REFERENCES auth.users(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = FALSE;

-- =====================================================
-- TRIGGERS: updated_at automático
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplies_updated_at BEFORE UPDATE ON supplies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supply_batches_updated_at BEFORE UPDATE ON supply_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_recipes_updated_at BEFORE UPDATE ON product_recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGERS: Actualizar estado de lotes
-- =====================================================

CREATE OR REPLACE FUNCTION update_batch_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_quantity <= 0 THEN
    NEW.status = 'agotado';
  ELSIF NEW.expiration_date IS NOT NULL AND NEW.expiration_date < CURRENT_DATE THEN
    NEW.status = 'vencido';
  ELSE
    NEW.status = 'disponible';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_supply_batch_status BEFORE UPDATE ON supply_batches
  FOR EACH ROW EXECUTE FUNCTION update_batch_status();

CREATE TRIGGER check_production_batch_status BEFORE UPDATE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION update_batch_status();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: permitir todo a usuarios autenticados
-- (Más adelante se refinan según roles)

CREATE POLICY "Allow authenticated users" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON units FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON supplies FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON supply_batches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON product_recipes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON production_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON production_order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON production_batches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON purchase_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON purchase_order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON inventory_movements FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON user_profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON alerts FOR ALL TO authenticated USING (true);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar unidades de medida por defecto
INSERT INTO units (name, symbol, type) VALUES
  ('Kilogramo', 'kg', 'peso'),
  ('Litro', 'L', 'volumen'),
  ('Unidad', 'und', 'unidad');

-- Obtener IDs de unidades base para las conversiones
DO $$
DECLARE
  kg_id UUID;
  l_id UUID;
  und_id UUID;
BEGIN
  SELECT id INTO kg_id FROM units WHERE symbol = 'kg';
  SELECT id INTO l_id FROM units WHERE symbol = 'L';
  SELECT id INTO und_id FROM units WHERE symbol = 'und';
  
  -- Unidades derivadas de peso
  INSERT INTO units (name, symbol, type, base_unit_id, conversion_factor) VALUES
    ('Gramo', 'g', 'peso', kg_id, 0.001),
    ('Libra', 'lb', 'peso', kg_id, 0.453592);
  
  -- Unidades derivadas de volumen
  INSERT INTO units (name, symbol, type, base_unit_id, conversion_factor) VALUES
    ('Mililitro', 'ml', 'volumen', l_id, 0.001),
    ('Galón', 'gal', 'volumen', l_id, 3.78541);
  
  -- Unidades derivadas de unidad
  INSERT INTO units (name, symbol, type, base_unit_id, conversion_factor) VALUES
    ('Docena', 'doc', 'unidad', und_id, 12),
    ('Caja', 'cja', 'unidad', und_id, 1);
END $$;

-- Categorías de ejemplo
INSERT INTO categories (name, type, description) VALUES
  ('Harinas', 'insumo', 'Harinas y derivados'),
  ('Lácteos', 'insumo', 'Productos lácteos'),
  ('Aditivos', 'insumo', 'Levaduras, mejoradores, etc'),
  ('Panes', 'producto', 'Pan de todo tipo'),
  ('Postres', 'producto', 'Pasteles, tortas, etc');

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
