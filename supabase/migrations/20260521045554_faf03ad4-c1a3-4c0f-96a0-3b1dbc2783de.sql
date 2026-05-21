
-- Likes
CREATE TABLE public.nft_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id bigint NOT NULL,
  wallet_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token_id, wallet_address)
);
CREATE INDEX idx_nft_likes_token ON public.nft_likes(token_id);
ALTER TABLE public.nft_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes public read" ON public.nft_likes FOR SELECT USING (true);
CREATE POLICY "Likes public insert" ON public.nft_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Likes public delete" ON public.nft_likes FOR DELETE USING (true);

-- Comments
CREATE TABLE public.nft_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id bigint NOT NULL,
  wallet_address text NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nft_comments_token ON public.nft_comments(token_id, created_at DESC);
ALTER TABLE public.nft_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments public read" ON public.nft_comments FOR SELECT USING (true);
CREATE POLICY "Comments public insert" ON public.nft_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Comments public delete" ON public.nft_comments FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.nft_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nft_comments;
