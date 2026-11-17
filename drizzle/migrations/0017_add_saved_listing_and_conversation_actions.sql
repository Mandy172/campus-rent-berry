ALTER TABLE public.conversations ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.toggle_borrowbee_favorite(p_listing_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in to save items.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.id = p_listing_id AND l.available = true) THEN RAISE EXCEPTION 'This item is not available right now.'; END IF;
  DELETE FROM public.favorites WHERE user_id = v_user_id AND listing_id = p_listing_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted > 0 THEN RETURN false; END IF;
  INSERT INTO public.favorites (user_id, listing_id) VALUES (v_user_id, p_listing_id);
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.toggle_borrowbee_favorite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_borrowbee_favorite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_borrowbee_conversation(p_listing_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_first uuid;
  v_second uuid;
  v_conversation_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in to message the owner.'; END IF;
  SELECT l.owner_id INTO v_owner_id FROM public.listings l WHERE l.id = p_listing_id AND l.available = true;
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'This item is not available right now.'; END IF;
  IF v_owner_id = v_user_id THEN RAISE EXCEPTION 'You cannot message yourself about your own item.'; END IF;
  IF v_user_id::text < v_owner_id::text THEN
    v_first := v_user_id;
    v_second := v_owner_id;
  ELSE
    v_first := v_owner_id;
    v_second := v_user_id;
  END IF;
  INSERT INTO public.conversations (listing_id, participant1_id, participant2_id)
  VALUES (p_listing_id, v_first, v_second)
  ON CONFLICT (listing_id, participant1_id, participant2_id)
  DO UPDATE SET listing_id = EXCLUDED.listing_id
  RETURNING id INTO v_conversation_id;
  RETURN v_conversation_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.start_borrowbee_conversation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_borrowbee_conversation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_borrowbee_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_participant1 uuid;
  v_participant2 uuid;
  v_recipient uuid;
  v_conversation public.conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_conversation FROM public.conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_id = v_conversation.participant1_id THEN
    v_recipient := v_conversation.participant2_id;
  ELSIF NEW.sender_id = v_conversation.participant2_id THEN
    v_recipient := v_conversation.participant1_id;
  ELSE
    RAISE EXCEPTION 'The sender is not a member of this conversation.';
  END IF;
  UPDATE public.conversations SET updated_at = NEW.created_at WHERE id = NEW.conversation_id;
  INSERT INTO public.notifications (user_id, title, body, href)
  VALUES (v_recipient, 'New BorrowBee message', left(NEW.body, 500), '/messages?conversation=' || NEW.conversation_id::text);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_borrowbee_new_message() FROM PUBLIC, anon, authenticated;