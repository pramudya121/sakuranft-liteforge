DROP POLICY IF EXISTS "Anyone can insert collections" ON public.collections_metadata;
DROP POLICY IF EXISTS "Public insert collections" ON public.collections_metadata;
DROP POLICY IF EXISTS "Collections public insert" ON public.collections_metadata;
DROP POLICY IF EXISTS "Collections metadata public insert" ON public.collections_metadata;

REVOKE EXECUTE ON FUNCTION public.increment_nft_view(bigint) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.increment_nft_view(bigint) TO authenticated, service_role;