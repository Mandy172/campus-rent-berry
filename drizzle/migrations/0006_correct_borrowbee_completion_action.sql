CREATE OR REPLACE FUNCTION public.respond_to_rental(p_rental_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_rows integer;
BEGIN
  IF p_action NOT IN ('cancel', 'accept', 'decline', 'complete') THEN RAISE EXCEPTION 'Choose a valid request action.'; END IF;
  UPDATE public.rentals
  SET status = CASE p_action WHEN 'cancel' THEN 'cancelled' WHEN 'accept' THEN 'accepted' WHEN 'decline' THEN 'declined' WHEN 'complete' THEN 'completed' END
  WHERE id = p_rental_id
    AND status = CASE WHEN p_action = 'complete' THEN 'accepted' ELSE 'pending' END;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'This request is unavailable or you are not allowed to update it.'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_rental(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_rental(uuid, text) TO authenticated;