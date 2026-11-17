REVOKE INSERT, UPDATE, DELETE ON public.rentals FROM authenticated;
CREATE OR REPLACE FUNCTION public.create_rental_request(p_listing_id text, p_start_date date, p_end_date date, p_quantity integer, p_note text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_days integer;
  v_subtotal numeric;
  v_fee numeric;
  v_deposit numeric;
  v_booked integer;
  v_rental_id uuid;
  v_unit_total numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in to request an item.'; END IF;
  IF p_note IS NULL OR char_length(trim(p_note)) > 500 THEN RAISE EXCEPTION 'Keep your note under 500 characters.'; END IF;
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id AND available = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This item is not available right now.'; END IF;
  IF v_listing.owner_id = v_user_id THEN RAISE EXCEPTION 'You cannot rent your own item.'; END IF;
  v_days := p_end_date - p_start_date + 1;
  IF p_start_date < current_date OR v_days < 1 OR v_days > 60 THEN RAISE EXCEPTION 'Choose dates from today through the next 60 days.'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > LEAST(v_listing.quantity, 99) THEN RAISE EXCEPTION 'The quantity is not available.'; END IF;
  SELECT COALESCE(sum(quantity), 0)::integer INTO v_booked
  FROM public.rentals
  WHERE listing_id = p_listing_id
    AND status IN ('pending', 'accepted')
    AND start_date <= p_end_date AND end_date >= p_start_date;
  IF v_booked + p_quantity > v_listing.quantity THEN RAISE EXCEPTION 'This item is fully booked for those dates.'; END IF;
  IF v_listing.daily_rate IS NOT NULL AND v_listing.daily_rate > 0 THEN
    v_unit_total := v_listing.daily_rate * v_days;
  ELSIF v_listing.flat_rate IS NOT NULL AND v_listing.flat_rate > 0 THEN
    v_unit_total := v_listing.flat_rate;
  ELSIF v_listing.hourly_rate IS NOT NULL AND v_listing.hourly_rate > 0 THEN
    v_unit_total := v_listing.hourly_rate * 8 * v_days;
  ELSE
    RAISE EXCEPTION 'The owner has not set a rental price.';
  END IF;
  v_subtotal := round(v_unit_total * p_quantity, 2);
  v_fee := round(v_subtotal * 0.125, 2);
  v_deposit := v_listing.deposit * p_quantity;
  INSERT INTO public.rentals (listing_id, borrower_id, owner_id, start_date, end_date, days, quantity, subtotal, fee, deposit, status, note)
  VALUES (p_listing_id, v_user_id, v_listing.owner_id, p_start_date, p_end_date, v_days, p_quantity, v_subtotal, v_fee, v_deposit, 'pending', trim(p_note))
  RETURNING id INTO v_rental_id;
  RETURN v_rental_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_rental_request(text, date, date, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_rental_request(text, date, date, integer, text) TO authenticated;
CREATE OR REPLACE FUNCTION public.respond_to_rental(p_rental_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rental public.rentals%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in to manage rental requests.'; END IF;
  IF p_action NOT IN ('cancel', 'accept', 'decline') THEN RAISE EXCEPTION 'Choose a valid request action.'; END IF;
  SELECT * INTO v_rental FROM public.rentals WHERE id = p_rental_id FOR UPDATE;
  IF NOT FOUND OR v_rental.status <> 'pending' THEN RAISE EXCEPTION 'This request is no longer pending.'; END IF;
  IF p_action = 'cancel' THEN
    IF v_rental.borrower_id <> v_user_id THEN RAISE EXCEPTION 'Only the borrower can cancel this request.'; END IF;
    UPDATE public.rentals SET status = 'cancelled' WHERE id = p_rental_id;
  ELSE
    IF v_rental.owner_id <> v_user_id THEN RAISE EXCEPTION 'Only the item owner can respond.'; END IF;
    UPDATE public.rentals SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END WHERE id = p_rental_id;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_rental(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_rental(uuid, text) TO authenticated;
CREATE POLICY "BorrowBee listing photo viewers can create signed image links" ON storage.objects FOR SELECT TO public USING (bucket_id = 'borrowbee-listings');
CREATE POLICY "Members can upload photos to their own listing folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'borrowbee-listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members can remove photos from their own listing folder" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'borrowbee-listings' AND (storage.foldername(name))[1] = auth.uid()::text);