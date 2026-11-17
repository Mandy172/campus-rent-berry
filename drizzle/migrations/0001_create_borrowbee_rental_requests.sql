CREATE TABLE public.rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  borrower_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL,
  fee numeric NOT NULL,
  deposit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentals TO authenticated;
GRANT ALL ON public.rentals TO service_role;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Borrowers and owners can read their rental requests" ON public.rentals FOR SELECT TO authenticated USING (borrower_id = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "Members can create rental requests as borrower" ON public.rentals FOR INSERT TO authenticated WITH CHECK (borrower_id = auth.uid() AND status = 'pending');
CREATE POLICY "Borrowers and owners can update their own rental requests" ON public.rentals FOR UPDATE TO authenticated USING (borrower_id = auth.uid() OR owner_id = auth.uid()) WITH CHECK ((borrower_id = auth.uid() AND status IN ('pending', 'cancelled')) OR (owner_id = auth.uid() AND status IN ('pending', 'accepted', 'declined')));
CREATE POLICY "Borrowers and owners can delete their own rental requests" ON public.rentals FOR DELETE TO authenticated USING (borrower_id = auth.uid() OR owner_id = auth.uid());
CREATE INDEX rentals_listing_dates_status_idx ON public.rentals (listing_id, start_date, end_date, status);