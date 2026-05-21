-- ============================================================
-- Supabase Storage: bucket "vouchers" para comprobantes de pago
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Crear el bucket público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vouchers',
  'vouchers',
  true,   -- público: cualquiera con la URL puede verlo (necesario para "Ver comprobante")
  10485760,  -- 10 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Política: cualquier usuario autenticado puede SUBIR su propio comprobante
CREATE POLICY "Clients can upload their own vouchers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vouchers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Política: lectura pública (la URL es pública, el admin necesita verlo)
CREATE POLICY "Public read vouchers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'vouchers');

-- 4. Política: el dueño puede actualizar/eliminar su comprobante
CREATE POLICY "Owner can update their voucher"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vouchers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
