-- 1) nft_likes: remove public SELECT that exposed all wallet addresses.
-- Owners can still read their own like row; counts come from a
-- SECURITY DEFINER function that returns just an integer.
DROP POLICY IF EXISTS "Likes public read" ON public.nft_likes;
DROP POLICY IF EXISTS "Likes owner read" ON public.nft_likes;
CREATE POLICY "Likes owner read" ON public.nft_likes
  FOR SELECT TO anon, authenticated
  USING (lower(wallet_address) = public.request_wallet());

CREATE OR REPLACE FUNCTION public.get_nft_like_count(p_token_id bigint)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.nft_likes WHERE token_id = p_token_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_nft_like_count(bigint) TO anon, authenticated;

-- 2) Realtime: drop the per-wallet notif-/inbox- channels since request_wallet()
-- is spoofable and can't be used for private channel authorization.
-- Only public listing / comment topics remain broadcastable.
DROP POLICY IF EXISTS "Channel access by wallet" ON realtime.messages;
CREATE POLICY "Channel access by wallet"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  (realtime.topic() LIKE 'listings-live:%')
  OR (realtime.topic() LIKE 'comments-%')
);

-- 3) Storage: add explicit UPDATE + DELETE deny policies for nft-images so
-- normal clients (anon / authenticated) cannot mutate or remove uploads.
-- Service role (server-side maintenance) still bypasses RLS.
DROP POLICY IF EXISTS "nft-images no user update" ON storage.objects;
DROP POLICY IF EXISTS "nft-images no user delete" ON storage.objects;
CREATE POLICY "nft-images no user update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'nft-images' AND false)
WITH CHECK (bucket_id = 'nft-images' AND false);

CREATE POLICY "nft-images no user delete"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'nft-images' AND false);