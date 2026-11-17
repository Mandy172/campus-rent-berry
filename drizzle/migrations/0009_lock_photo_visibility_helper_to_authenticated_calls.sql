REVOKE EXECUTE ON FUNCTION public.borrowbee_photo_is_visible(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrowbee_photo_is_visible(text) TO authenticated;