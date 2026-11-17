CREATE TABLE public.payout_accounts (
  owner_id uuid PRIMARY KEY,
  stripe_account_id text NOT NULL UNIQUE,
  connected boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_accounts TO authenticated;
GRANT ALL ON public.payout_accounts TO service_role;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their own payout setup" ON public.payout_accounts FOR SELECT TO authenticated USING (owner_id = auth.uid());