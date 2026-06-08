
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id BIGINT,
  token_id BIGINT NOT NULL,
  seller TEXT NOT NULL,
  price_wei TEXT NOT NULL,
  price_eth NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'zkLTC',
  status TEXT NOT NULL DEFAULT 'active',
  tx_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX listings_token_id_idx ON public.listings(token_id);
CREATE INDEX listings_seller_idx ON public.listings(seller);
CREATE INDEX listings_status_idx ON public.listings(status);
CREATE UNIQUE INDEX listings_listing_id_uniq ON public.listings(listing_id) WHERE listing_id IS NOT NULL;

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listings are publicly viewable"
  ON public.listings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can record a listing"
  ON public.listings FOR INSERT
  TO anon, authenticated
  WITH CHECK (seller IS NOT NULL AND length(seller) > 0);

CREATE POLICY "Seller can update own listing"
  ON public.listings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Seller can delete own listing"
  ON public.listings FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER TABLE public.listings REPLICA IDENTITY FULL;
