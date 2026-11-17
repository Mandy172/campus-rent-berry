CREATE OR REPLACE FUNCTION public.enforce_borrowbee_rental_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_days integer;
  v_booked integer;
  v_unit_total numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in to manage rental requests.'; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id AND available = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'This item is not available right now.'; END IF;
    IF NEW.borrower_id <> v_user_id OR NEW.owner_id <> v_listing.owner_id OR NEW.owner_id = v_user_id THEN RAISE EXCEPTION 'Rental requests must be created by a different member for an available item.'; END IF;
    v_days := NEW.end_date - NEW.start_date + 1;
    IF NEW.start_date < current_date OR v_days < 1 OR v_days > 60 THEN RAISE EXCEPTION 'Choose dates from today through the next 60 days.'; END IF;
    IF NEW.quantity < 1 OR NEW.quantity > LEAST(v_listing.quantity, 99) THEN RAISE EXCEPTION 'The quantity is not available.'; END IF;
    IF NEW.note IS NULL OR char_length(trim(NEW.note)) > 500 THEN RAISE EXCEPTION 'Keep your note under 500 characters.'; END IF;
    SELECT COALESCE(sum(quantity), 0)::integer INTO v_booked FROM public.rentals WHERE listing_id = NEW.listing_id AND status IN ('pending', 'accepted') AND start_date <= NEW.end_date AND end_date >= NEW.start_date;
    IF v_booked + NEW.quantity > v_listing.quantity THEN RAISE EXCEPTION 'This item is fully booked for those dates.'; END IF;
    IF v_listing.daily_rate IS NOT NULL AND v_listing.daily_rate > 0 THEN v_unit_total := v_listing.daily_rate * v_days;
    ELSIF v_listing.flat_rate IS NOT NULL AND v_listing.flat_rate > 0 THEN v_unit_total := v_listing.flat_rate;
    ELSIF v_listing.hourly_rate IS NOT NULL AND v_listing.hourly_rate > 0 THEN v_unit_total := v_listing.hourly_rate * 8 * v_days;
    ELSE RAISE EXCEPTION 'The owner has not set a rental price.';
    END IF;
    NEW.days := v_days;
    NEW.subtotal := round(v_unit_total * NEW.quantity, 2);
    NEW.fee := round(NEW.subtotal * 0.125, 2);
    NEW.deposit := v_listing.deposit * NEW.quantity;
    NEW.status := 'pending';
    NEW.note := trim(NEW.note);
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.listing_id IS DISTINCT FROM OLD.listing_id OR NEW.borrower_id IS DISTINCT FROM OLD.borrower_id OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date OR NEW.days IS DISTINCT FROM OLD.days OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.fee IS DISTINCT FROM OLD.fee OR NEW.deposit IS DISTINCT FROM OLD.deposit OR NEW.note IS DISTINCT FROM OLD.note OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Rental details cannot be changed after a request is created.'; END IF;
  IF OLD.status = 'pending' AND NEW.status = 'cancelled' AND OLD.borrower_id = v_user_id THEN RETURN NEW; END IF;
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined') AND OLD.owner_id = v_user_id THEN RETURN NEW; END IF;
  IF OLD.status = 'accepted' AND NEW.status = 'completed' AND OLD.owner_id = v_user_id THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Only the borrower may cancel a pending request; the item owner may respond to pending requests or complete accepted rentals.';
END;
$$;
CREATE OR REPLACE FUNCTION public.respond_to_rental(p_rental_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_rows integer;
BEGIN
  IF p_action NOT IN ('cancel', 'accept', 'decline', 'complete') THEN RAISE EXCEPTION 'Choose a valid request action.'; END IF;
  UPDATE public.rentals SET status = CASE WHEN p_action = 'cancel' THEN 'cancelled' ELSE p_action || 'ed' END WHERE id = p_rental_id AND status = CASE WHEN p_action = 'complete' THEN 'accepted' ELSE 'pending' END;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'This request is unavailable or you are not allowed to update it.'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_rental(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_rental(uuid, text) TO authenticated;