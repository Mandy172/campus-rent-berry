CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage only their saved listings" ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members save listings for themselves" ON public.favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members remove only their saved listings" ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  participant1_id uuid NOT NULL,
  participant2_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_distinct_participants CHECK (participant1_id <> participant2_id),
  CONSTRAINT conversations_listing_participants_unique UNIQUE (listing_id, participant1_id, participant2_id)
);
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read conversations they participate in" ON public.conversations FOR SELECT TO authenticated USING (participant1_id = auth.uid() OR participant2_id = auth.uid());
CREATE POLICY "Members can start a conversation with an available listing owner" ON public.conversations FOR INSERT TO authenticated WITH CHECK (
  participant1_id = auth.uid()
  AND participant2_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id AND l.available = true AND l.owner_id = participant2_id
  )
);
CREATE INDEX conversations_participant1_created_idx ON public.conversations (participant1_id, created_at DESC);
CREATE INDEX conversations_participant2_created_idx ON public.conversations (participant2_id, created_at DESC);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read messages in their conversations" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
);
CREATE POLICY "Members can send messages in their conversations" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
);
CREATE INDEX messages_conversation_created_idx ON public.messages (conversation_id, created_at);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) <= 120),
  body text NOT NULL CHECK (char_length(body) <= 500),
  href text NOT NULL CHECK (href LIKE '/%'),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read their own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members can mark their own notifications read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_borrowbee_rental_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_title text;
BEGIN
  SELECT title INTO v_title FROM public.listings WHERE id = NEW.listing_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, href)
    VALUES (NEW.owner_id, 'New rental request', 'Someone requested ' || COALESCE(v_title, 'your item') || '.', '/my-rentals');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, title, body, href)
      VALUES (NEW.borrower_id, 'Rental accepted', 'Your request for ' || COALESCE(v_title, 'an item') || ' was accepted.', '/my-rentals');
    ELSIF NEW.status = 'declined' THEN
      INSERT INTO public.notifications (user_id, title, body, href)
      VALUES (NEW.borrower_id, 'Rental declined', 'Your request for ' || COALESCE(v_title, 'an item') || ' was declined.', '/my-rentals');
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, title, body, href)
      VALUES (NEW.owner_id, 'Rental request cancelled', 'The request for ' || COALESCE(v_title, 'your item') || ' was cancelled.', '/my-rentals');
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, title, body, href)
      VALUES (NEW.borrower_id, 'Rental complete', 'The rental for ' || COALESCE(v_title, 'an item') || ' was marked complete.', '/my-rentals');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_borrowbee_rental_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_borrowbee_rental_change_after_write AFTER INSERT OR UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.notify_borrowbee_rental_change();

CREATE OR REPLACE FUNCTION public.notify_borrowbee_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_participant1 uuid;
  v_participant2 uuid;
  v_listing_id text;
  v_title text;
  v_recipient uuid;
BEGIN
  SELECT participant1_id, participant2_id, listing_id
    INTO v_participant1, v_participant2, v_listing_id
    FROM public.conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_id = v_participant1 THEN
    v_recipient := v_participant2;
  ELSIF NEW.sender_id = v_participant2 THEN
    v_recipient := v_participant1;
  ELSE
    RAISE EXCEPTION 'The sender is not a member of this conversation.';
  END IF;
  SELECT title INTO v_title FROM public.listings WHERE id = v_listing_id;
  INSERT INTO public.notifications (user_id, title, body, href)
  VALUES (v_recipient, 'New BorrowBee message', left(NEW.body, 500), '/messages?conversation=' || NEW.conversation_id::text);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_borrowbee_new_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_borrowbee_new_message_after_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_borrowbee_new_message();