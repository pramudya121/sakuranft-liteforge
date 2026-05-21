
-- Profiles table (wallet-based)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  twitter TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_wallet ON public.profiles(lower(wallet_address));
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profile" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profile" ON public.profiles FOR UPDATE USING (true);

-- Watchlist
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  token_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_address, token_id)
);
CREATE INDEX idx_watchlist_wallet ON public.watchlist(lower(wallet_address));
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Watchlist public read" ON public.watchlist FOR SELECT USING (true);
CREATE POLICY "Watchlist public insert" ON public.watchlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Watchlist public delete" ON public.watchlist FOR DELETE USING (true);

-- NFT views
CREATE TABLE public.nft_views (
  token_id BIGINT NOT NULL PRIMARY KEY,
  view_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nft_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Views public read" ON public.nft_views FOR SELECT USING (true);
CREATE POLICY "Views public upsert" ON public.nft_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Views public update" ON public.nft_views FOR UPDATE USING (true);

-- Increment function
CREATE OR REPLACE FUNCTION public.increment_nft_view(p_token_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  token_id BIGINT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_wallet ON public.notifications(lower(wallet_address), created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notif public read" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Notif public insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Notif public update" ON public.notifications FOR UPDATE USING (true);

-- Collections metadata
CREATE TABLE public.collections_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_address TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT,
  banner_url TEXT,
  logo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collections_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collections public read" ON public.collections_metadata FOR SELECT USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
