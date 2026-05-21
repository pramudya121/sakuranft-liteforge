
INSERT INTO storage.buckets (id, name, public) VALUES ('nft-images', 'nft-images', true);

CREATE POLICY "Public read nft images" ON storage.objects
  FOR SELECT USING (bucket_id = 'nft-images');

CREATE POLICY "Anyone can upload nft images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'nft-images');
