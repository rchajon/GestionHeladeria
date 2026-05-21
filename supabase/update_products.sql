  -- ============================================================
  -- ACTUALIZAR PRODUCTOS — HeladosERP Guatemala
  -- Ejecuta este SQL en Supabase > SQL Editor
  -- ============================================================

  -- 1. Borrar datos de prueba en orden (respetando claves foráneas)
  delete from public.payments;
  delete from public.order_items;
  delete from public.orders;
  delete from public.inventory_movements;
  delete from public.production_records;
  delete from public.products;

  -- 2. Insertar los 19 sabores reales
  --    · price_per_unit = Q50.00 (bolsa de 10 unidades a Q5 c/u)
  --    · unit_label     = 'bolsa x10'
  --    · stock inicial  = 0 (se carga desde Producción)
  --    · min_stock      = 10 bolsas (umbral de alerta)
  insert into public.products (name, description, flavor, price_per_unit, unit_label, stock, min_stock)
  values
    ('Helado de Coco',        'Sabor natural de coco',                    'Coco',         50.00, 'bolsa x10', 0, 10),
    ('Helado Mora Coco',      'Combinación de mora y coco',               'Mora Coco',    50.00, 'bolsa x10', 0, 10),
    ('Helado Fresa Coco',     'Fresa con toque de coco',                  'Fresa Coco',   50.00, 'bolsa x10', 0, 10),
    ('Helado Fresa Crema',    'Fresa con crema suave',                    'Fresa Crema',  50.00, 'bolsa x10', 0, 10),
    ('Helado Oreo',           'Crema con galleta Oreo',                   'Oreo',         50.00, 'bolsa x10', 0, 10),
    ('Helado de Manía',       'Sabor a maní tostado',                     'Manía',        50.00, 'bolsa x10', 0, 10),
    ('Helado de Higo',        'Sabor natural de higo',                    'Higo',         50.00, 'bolsa x10', 0, 10),
    ('Helado de Frutas',      'Mezcla de frutas tropicales',              'Frutas',       50.00, 'bolsa x10', 0, 10),
    ('Helado de Melocotón',   'Sabor a melocotón fresco',                 'Melocotón',    50.00, 'bolsa x10', 0, 10),
    ('Helado Piña Colada',    'Piña con coco estilo piña colada',         'Piña Colada',  50.00, 'bolsa x10', 0, 10),
    ('Helado Piña Fresa',     'Combinación de piña y fresa',              'Piña Fresa',   50.00, 'bolsa x10', 0, 10),
    ('Helado Piña Mora',      'Combinación de piña y mora',               'Piña Mora',    50.00, 'bolsa x10', 0, 10),
    ('Helado Mango Maduro',   'Mango maduro natural',                     'Mango Maduro', 50.00, 'bolsa x10', 0, 10),
    ('Helado Mango Fresa',    'Combinación de mango y fresa',             'Mango Fresa',  50.00, 'bolsa x10', 0, 10),
    ('Helado Mango Mora',     'Combinación de mango y mora',              'Mango Mora',   50.00, 'bolsa x10', 0, 10),
    ('Helado de Chocolate',   'Chocolate cremoso',                        'Chocolate',    50.00, 'bolsa x10', 0, 10),
    ('Helado de Café',        'Café guatemalteco',                        'Café',         50.00, 'bolsa x10', 0, 10),
    ('Helado Chocococo',      'Chocolate con coco',                       'Chocococo',    50.00, 'bolsa x10', 0, 10),
    ('Helado Crema Pasas',    'Crema con pasas',                          'Crema Pasas',  50.00, 'bolsa x10', 0, 10);

  -- 3. Verificar
  select name, flavor, price_per_unit, unit_label from public.products order by name;
