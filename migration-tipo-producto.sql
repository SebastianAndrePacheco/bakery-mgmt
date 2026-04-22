-- Agrega clasificación por tipo a la tabla de productos terminados
ALTER TABLE products
  ADD COLUMN tipo_producto TEXT NOT NULL DEFAULT 'otro'
  CONSTRAINT products_tipo_producto_check CHECK (tipo_producto IN (
    'pan_sal',
    'pan_dulce',
    'pan_integral',
    'torta_pastel',
    'bizcocho_queque',
    'galleta',
    'empanada_salado',
    'hojaldre',
    'dona_berlin',
    'paneton',
    'postre',
    'otro'
  ));
