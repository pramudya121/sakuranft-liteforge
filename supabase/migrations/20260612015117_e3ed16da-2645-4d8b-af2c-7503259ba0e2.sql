
DROP POLICY IF EXISTS "Notifications connected insert" ON public.notifications;
CREATE POLICY "Notifications connected insert" ON public.notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.request_wallet() <> '' AND char_length(coalesce(title, '')) BETWEEN 1 AND 200 AND char_length(coalesce(message, '')) <= 1000);
