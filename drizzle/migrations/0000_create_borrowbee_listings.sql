CREATE TABLE public.listings (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL,
  owner_name text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  condition text NOT NULL DEFAULT 'Good',
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  hourly_rate numeric,
  daily_rate numeric,
  flat_rate numeric,
  quantity integer NOT NULL DEFAULT 1,
  deposit numeric NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  rules text[] NOT NULL DEFAULT '{}',
  agreement_template text NOT NULL DEFAULT 'standard',
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  location text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read available listings" ON public.listings FOR SELECT TO anon USING (available = true);
CREATE POLICY "Members can read available listings and their own" ON public.listings FOR SELECT TO authenticated USING (available = true OR owner_id = auth.uid());
CREATE POLICY "Members can create their own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Members can update their own listings" ON public.listings FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Members can delete their own listings" ON public.listings FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX listings_available_created_at_idx ON public.listings (available, created_at DESC);
INSERT INTO public.listings (id, owner_id, owner_name, title, category, description, tags, hourly_rate, daily_rate, deposit, location, media, created_at) VALUES
('lst_seed_1', '00000000-0000-4000-8000-000000000001', 'Kiran O.', 'White Rolling Standing Cooler | Event & Party Drinks Station', 'event', 'Rolling patio cooler with a built-in bottle opener and side shelf. Holds about 70 cans with ice. Perfect for club events, fest stalls and hostel nights.', ARRAY['cooler','fest','party'], NULL, 900, 1500, 'Boys Hostel, Block A', '[{"url":"/items/rolling-cooler.jpg","type":"image"}]', now() - interval '1 day'),
('lst_seed_2', '00000000-0000-4000-8000-000000000001', 'Kiran O.', 'White Display Cart | Candy, Dessert, Favors Stall', 'event', 'Wooden display cart with a scalloped canopy and two shelves. Great for bake sales, cultural fest stalls and department open days. Jars included.', ARRAY['stall','display','fest'], NULL, 800, 2000, 'Food Court', '[{"url":"/items/display-cart.jpg","type":"image"}]', now() - interval '2 days'),
('lst_seed_3', '00000000-0000-4000-8000-000000000002', 'Jay M.', 'Drone 4K Mini', 'electronics', 'Compact 4K camera drone with controller, three batteries and a carry case. Ideal for project shoots, sports day aerials and short films. Follow campus drone rules.', ARRAY['drone','video','photography'], 120, 550, 5000, 'Engineering Block', '[{"url":"/items/drone.jpg","type":"image"}]', now() - interval '3 days'),
('lst_seed_4', '00000000-0000-4000-8000-000000000002', 'Jay M.', 'Hot Box', 'event', 'Insulated stainless steel food warming cabinet on wheels. Keeps trays hot for hours, useful for department lunches and event catering.', ARRAY['catering','food warmer'], NULL, 1500, 3000, 'Food Court', '[{"url":"/items/hot-box.jpg","type":"image"}]', now() - interval '4 days'),
('lst_seed_5', '00000000-0000-4000-8000-000000000002', 'Jay M.', 'Evaporative Cooler', 'event', 'Large portable air cooler for halls, stalls and outdoor events. Covers roughly 800 sq ft. Fill with water and plug in.', ARRAY['cooling','summer'], NULL, 1200, 2500, 'Auditorium Lobby', '[{"url":"/items/evaporative-cooler.jpg","type":"image"}]', now() - interval '5 days'),
('lst_seed_6', '00000000-0000-4000-8000-000000000002', 'Jay M.', 'Patio Heater', 'outdoor', 'Tall stainless steel patio heater for winter evening events and outdoor gatherings. Gas cylinder not included.', ARRAY['heater','winter','outdoor'], NULL, 1000, 2000, 'Sports Complex', '[{"url":"/items/patio-heater.jpg","type":"image"}]', now() - interval '6 days'),
('lst_seed_7', '00000000-0000-4000-8000-000000000002', 'Jay M.', 'Pressure Washer', 'tools', 'Petrol pressure washer with a 25 ft hose and three nozzles. Great for cleaning bikes, cars and club equipment before a big event.', ARRAY['cleaning','tools'], 100, 450, 1500, 'Main Gate', '[{"url":"/items/pressure-washer.jpg","type":"image"}]', now() - interval '7 days'),
('lst_seed_8', '00000000-0000-4000-8000-000000000001', 'Kiran O.', 'White Bounce House', 'event', 'Inflatable white bounce house with sheer curtains and a blower. A crowd favourite for fest fun zones and faculty family days.', ARRAY['inflatable','fest','kids'], NULL, 2500, 4000, 'Sports Complex', '[{"url":"/items/bounce-house.jpg","type":"image"}]', now() - interval '8 days');