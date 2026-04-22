-- Agrega clasificación por tipo a la tabla de insumos
ALTER TABLE supplies
  ADD COLUMN tipo_insumo TEXT NOT NULL DEFAULT 'otro'
  CONSTRAINT supplies_tipo_insumo_check CHECK (tipo_insumo IN (
    'harina_almidon',
    'lacteo',
    'huevo',
    'grasa_aceite',
    'azucar_endulzante',
    'levadura_fermento',
    'sal_condimento',
    'aditivo_mejorador',
    'relleno_cobertura',
    'fruta_semilla_fruto_seco',
    'colorante_saborizante',
    'agua_liquido',
    'envase_empaque',
    'limpieza_higiene',
    'combustible',
    'otro'
  ));
