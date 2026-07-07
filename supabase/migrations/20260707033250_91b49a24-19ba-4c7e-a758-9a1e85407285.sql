
-- 1) Public SELECT policy on nft_likes so counts can be queried anonymously.
--    (Existing wallet-scoped policies remain for authenticated flows.)
DROP POLICY IF EXISTS "nft_likes public read" ON public.nft_likes;
CREATE POLICY "nft_likes public read"
  ON public.nft_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.nft_likes TO anon;

-- 2) Remove SECURITY DEFINER helper — no longer needed now that counts are
--    readable directly. Fixes SUPA_{anon,authenticated}_security_definer_function_executable.
DROP FUNCTION IF EXISTS public.get_nft_like_count(bigint);

-- 3) Harden increment_nft_view: switch to SECURITY INVOKER (RLS-safe) and
--    restrict EXECUTE. nft_views already has an INSERT/UPDATE policy for
--    anon+authenticated used by the like/view flow.
CREATE OR REPLACE FUNCTION public.increment_nft_view(p_token_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.nft_views (token_id, view_count, updated_at)
  VALUES (p_token_id, 1, now())
  ON CONFLICT (token_id) DO UPDATE
    SET view_count = public.nft_views.view_count + 1,
        updated_at = now();
END;
$$;
