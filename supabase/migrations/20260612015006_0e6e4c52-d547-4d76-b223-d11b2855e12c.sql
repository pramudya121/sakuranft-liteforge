
-- Convert increment_nft_view to SECURITY INVOKER so it's not a definer endpoint exposed to anon.
CREATE OR REPLACE FUNCTION public.increment_nft_view(p_token_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.nft_views (token_id, view_count, updated_at)
  VALUES (p_token_id, 1, now())
  ON CONFLICT (token_id) DO UPDATE
    SET view_count = public.nft_views.view_count + 1,
        updated_at = now();
END;
$function$;

-- Allow anon/authenticated to invoke the view counter (now safe since it's INVOKER and RLS applies).
REVOKE EXECUTE ON FUNCTION public.increment_nft_view(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_nft_view(bigint) TO anon, authenticated;

-- nft_views needs INSERT/UPDATE policies for the public counter to work under SECURITY INVOKER.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nft_views' AND policyname='Views public insert') THEN
    CREATE POLICY "Views public insert" ON public.nft_views FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nft_views' AND policyname='Views public update') THEN
    CREATE POLICY "Views public update" ON public.nft_views FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
GRANT INSERT, UPDATE ON public.nft_views TO anon, authenticated;

-- Restrict notifications: only the owning wallet (passed via the x-wallet-address request header)
-- can read/update their notifications. Inserts must come from the service role (server functions).
DROP POLICY IF EXISTS "Notif public read" ON public.notifications;
DROP POLICY IF EXISTS "Notif public update" ON public.notifications;
DROP POLICY IF EXISTS "Notif public insert" ON public.notifications;

CREATE POLICY "Notifications owner read" ON public.notifications
  FOR SELECT TO anon, authenticated
  USING (
    lower(wallet_address) = lower(coalesce(
      (current_setting('request.headers', true)::jsonb ->> 'x-wallet-address'),
      ''
    ))
    AND coalesce((current_setting('request.headers', true)::jsonb ->> 'x-wallet-address'), '') <> ''
  );

CREATE POLICY "Notifications owner update" ON public.notifications
  FOR UPDATE TO anon, authenticated
  USING (
    lower(wallet_address) = lower(coalesce(
      (current_setting('request.headers', true)::jsonb ->> 'x-wallet-address'),
      ''
    ))
    AND coalesce((current_setting('request.headers', true)::jsonb ->> 'x-wallet-address'), '') <> ''
  )
  WITH CHECK (
    lower(wallet_address) = lower(coalesce(
      (current_setting('request.headers', true)::jsonb ->> 'x-wallet-address'),
      ''
    ))
  );

-- Helper: extract caller wallet from request header (lowercased, empty if absent).
CREATE OR REPLACE FUNCTION public.request_wallet()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT lower(coalesce(
    (current_setting('request.headers', true)::jsonb ->> 'x-wallet-address'),
    ''
  ));
$$;
GRANT EXECUTE ON FUNCTION public.request_wallet() TO anon, authenticated;

-- profiles: only owner (by header) can update; no inserts from public (use upsert via service role or owner).
DROP POLICY IF EXISTS "Anyone can update profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Profile owner update" ON public.profiles;
DROP POLICY IF EXISTS "Profile owner insert" ON public.profiles;

CREATE POLICY "Profile owner insert" ON public.profiles
  FOR INSERT TO anon, authenticated
  WITH CHECK (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '');

CREATE POLICY "Profile owner update" ON public.profiles
  FOR UPDATE TO anon, authenticated
  USING (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '')
  WITH CHECK (lower(wallet_address) = public.request_wallet());

-- watchlist: insert/delete only your own rows
DROP POLICY IF EXISTS "Watchlist public insert" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist public delete" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist public read" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist owner insert" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist owner delete" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist owner read" ON public.watchlist;

CREATE POLICY "Watchlist owner read" ON public.watchlist
  FOR SELECT TO anon, authenticated
  USING (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '');
CREATE POLICY "Watchlist owner insert" ON public.watchlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '');
CREATE POLICY "Watchlist owner delete" ON public.watchlist
  FOR DELETE TO anon, authenticated
  USING (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '');

-- nft_likes: only owner can insert/delete their like
DROP POLICY IF EXISTS "Likes public insert" ON public.nft_likes;
DROP POLICY IF EXISTS "Likes public delete" ON public.nft_likes;
DROP POLICY IF EXISTS "Likes owner insert" ON public.nft_likes;
DROP POLICY IF EXISTS "Likes owner delete" ON public.nft_likes;
CREATE POLICY "Likes owner insert" ON public.nft_likes
  FOR INSERT TO anon, authenticated
  WITH CHECK (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '');
CREATE POLICY "Likes owner delete" ON public.nft_likes
  FOR DELETE TO anon, authenticated
  USING (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '');

-- nft_comments: only author can insert/delete
DROP POLICY IF EXISTS "Comments public insert" ON public.nft_comments;
DROP POLICY IF EXISTS "Comments public delete" ON public.nft_comments;
DROP POLICY IF EXISTS "Comments author insert" ON public.nft_comments;
DROP POLICY IF EXISTS "Comments author delete" ON public.nft_comments;
CREATE POLICY "Comments author insert" ON public.nft_comments
  FOR INSERT TO anon, authenticated
  WITH CHECK (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '' AND char_length(content) BETWEEN 1 AND 1000);
CREATE POLICY "Comments author delete" ON public.nft_comments
  FOR DELETE TO anon, authenticated
  USING (lower(wallet_address) = public.request_wallet() AND public.request_wallet() <> '');

-- listings: only seller can update/delete; insert restricted to seller=caller
DROP POLICY IF EXISTS "Seller can update own listing" ON public.listings;
DROP POLICY IF EXISTS "Seller can delete own listing" ON public.listings;
DROP POLICY IF EXISTS "Seller can insert own listing" ON public.listings;
DROP POLICY IF EXISTS "Listings public insert" ON public.listings;
DROP POLICY IF EXISTS "Listings public update" ON public.listings;
DROP POLICY IF EXISTS "Listings public delete" ON public.listings;

CREATE POLICY "Listings seller insert" ON public.listings
  FOR INSERT TO anon, authenticated
  WITH CHECK (lower(seller) = public.request_wallet() AND public.request_wallet() <> '');
CREATE POLICY "Listings seller update" ON public.listings
  FOR UPDATE TO anon, authenticated
  USING (lower(seller) = public.request_wallet() AND public.request_wallet() <> '')
  WITH CHECK (lower(seller) = public.request_wallet());
CREATE POLICY "Listings seller delete" ON public.listings
  FOR DELETE TO anon, authenticated
  USING (lower(seller) = public.request_wallet() AND public.request_wallet() <> '');

-- nft_offers: bidder can insert/update/cancel their own offer; owner can update status on their token
DROP POLICY IF EXISTS "Offers public insert" ON public.nft_offers;
DROP POLICY IF EXISTS "Offers public update" ON public.nft_offers;
DROP POLICY IF EXISTS "Offers public delete" ON public.nft_offers;
DROP POLICY IF EXISTS "Offers bidder insert" ON public.nft_offers;
DROP POLICY IF EXISTS "Offers participant update" ON public.nft_offers;
DROP POLICY IF EXISTS "Offers bidder delete" ON public.nft_offers;

CREATE POLICY "Offers bidder insert" ON public.nft_offers
  FOR INSERT TO anon, authenticated
  WITH CHECK (lower(bidder_address) = public.request_wallet() AND public.request_wallet() <> '');
CREATE POLICY "Offers participant update" ON public.nft_offers
  FOR UPDATE TO anon, authenticated
  USING (
    public.request_wallet() <> '' AND (
      lower(bidder_address) = public.request_wallet()
      OR lower(coalesce(owner_address, '')) = public.request_wallet()
    )
  )
  WITH CHECK (
    public.request_wallet() <> '' AND (
      lower(bidder_address) = public.request_wallet()
      OR lower(coalesce(owner_address, '')) = public.request_wallet()
    )
  );
CREATE POLICY "Offers bidder delete" ON public.nft_offers
  FOR DELETE TO anon, authenticated
  USING (lower(bidder_address) = public.request_wallet() AND public.request_wallet() <> '');

-- Make sure anon has the necessary table privileges (RLS still enforces ownership).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.watchlist, public.nft_likes, public.nft_comments, public.listings, public.nft_offers, public.notifications TO anon, authenticated;
GRANT ALL ON public.profiles, public.watchlist, public.nft_likes, public.nft_comments, public.listings, public.nft_offers, public.notifications, public.nft_views TO service_role;
