-- 1. Revoke EXECUTE on increment_nft_view from authenticated role.
--    The app uses anon for all calls, so authenticated never needs it.
REVOKE EXECUTE ON FUNCTION public.increment_nft_view(bigint) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_nft_view(bigint) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_nft_view(bigint) TO anon;
GRANT  EXECUTE ON FUNCTION public.increment_nft_view(bigint) TO service_role;

-- 2. Lock down public bucket listing for nft-images: anyone can still download
--    a known URL (bucket stays public), but enumerating the bucket via
--    storage.objects SELECT is removed.
DROP POLICY IF EXISTS "Public read nft-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read nft-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "nft-images public list" ON storage.objects;
-- (We deliberately do NOT add any SELECT policy on storage.objects for this
--  bucket. The bucket itself is still public=true so direct CDN URLs work,
--  but listing/enumerating the bucket via the Data API is no longer possible.)