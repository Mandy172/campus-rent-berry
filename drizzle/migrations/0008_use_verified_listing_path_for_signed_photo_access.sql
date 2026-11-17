DROP POLICY IF EXISTS "Public may create signed links for available listing photos" ON storage.objects;
CREATE OR REPLACE FUNCTION public.borrowbee_photo_is_visible(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.available = true
      AND l.owner_id::text = (storage.foldername(p_name))[1]
      AND l.media @> jsonb_build_array(jsonb_build_object('url', p_name))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.borrowbee_photo_is_visible(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrowbee_photo_is_visible(text) TO authenticated;
CREATE POLICY "Public may create signed links for available listing photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'borrowbee-listings' AND public.borrowbee_photo_is_visible(name));