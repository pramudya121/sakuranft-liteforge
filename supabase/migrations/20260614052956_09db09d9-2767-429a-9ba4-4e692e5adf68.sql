-- 1) Notifications: remove broad anon INSERT policy. Inserts now go through
-- the sendNotificationFn server function (service role) with strict input validation.
DROP POLICY IF EXISTS "Notifications connected insert" ON public.notifications;

-- 2) Storage uploads: tighten the public 'nft-images' upload policy.
-- Require a connected wallet, restrict MIME to images, and cap size at 5MB.
DROP POLICY IF EXISTS "Anyone can upload nft images" ON storage.objects;

CREATE POLICY "Connected wallet image upload"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'nft-images'
  AND public.request_wallet() <> ''
  AND lower(coalesce(metadata->>'mimetype', '')) IN ('image/png','image/jpeg','image/webp','image/gif')
  AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
);

-- 3) Realtime channel authorization. Enable RLS on realtime.messages and
-- only allow subscribers to join channels they should see:
--  * public listings + comments channels
--  * the per-wallet notification + activity inbox channels
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Channel access by wallet" ON realtime.messages;

CREATE POLICY "Channel access by wallet"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  (realtime.topic() LIKE 'listings-live:%')
  OR (realtime.topic() LIKE 'comments-%')
  OR (
    public.request_wallet() <> ''
    AND realtime.topic() IN (
      'notif-' || public.request_wallet(),
      'inbox-' || public.request_wallet()
    )
  )
);
