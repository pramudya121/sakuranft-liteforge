CREATE TABLE public.nft_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id bigint NOT NULL,
  bidder_address text NOT NULL,
  owner_address text,
  amount_eth numeric NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nft_offers_token ON public.nft_offers(token_id);
CREATE INDEX idx_nft_offers_bidder ON public.nft_offers(bidder_address);
CREATE INDEX idx_nft_offers_owner ON public.nft_offers(owner_address);

ALTER TABLE public.nft_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offers public read" ON public.nft_offers FOR SELECT USING (true);
CREATE POLICY "Offers public insert" ON public.nft_offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Offers public update" ON public.nft_offers FOR UPDATE USING (true);
CREATE POLICY "Offers public delete" ON public.nft_offers FOR DELETE USING (true);

CREATE TRIGGER trg_nft_offers_updated_at
  BEFORE UPDATE ON public.nft_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.nft_offers;