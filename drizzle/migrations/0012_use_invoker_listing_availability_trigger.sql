CREATE OR REPLACE FUNCTION public.enforce_borrowbee_rental_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'This request is no longer pending.'; END IF;
  IF NEW.status = 'cancelled' AND OLD.borrower_id = v_user_id THEN RETURN NEW; END IF;
  IF NEW.status IN ('accepted', 'declined') AND OLD.owner_id = v_user_id THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Only the borrower may cancel and only the item owner may accept or decline a pending request.';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_borrowbee_rental_changes() FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Members can read available listings and their own" ON public.listings;
CREATE POLICY "Members can read available listings and their own" ON public.listings FOR SELECT TO authenticated USING (available = true OR owner_id = auth.uid());