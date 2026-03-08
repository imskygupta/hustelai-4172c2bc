
-- Courses table for Infinity tier users
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  category TEXT DEFAULT 'General',
  thumbnail_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published courses" ON public.courses
  FOR SELECT USING (is_published = true);

CREATE POLICY "Infinity users can create courses" ON public.courses
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND subscription_tier = 'infinity')
  );

CREATE POLICY "Creators can update own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own courses" ON public.courses
  FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Marketplace items table for selling tools/templates
CREATE TABLE public.marketplace_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  category TEXT DEFAULT 'Template',
  item_type TEXT NOT NULL DEFAULT 'tool',
  download_url TEXT,
  preview_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published items" ON public.marketplace_items
  FOR SELECT USING (is_published = true);

CREATE POLICY "Infinity users can create items" ON public.marketplace_items
  FOR INSERT WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND subscription_tier = 'infinity')
  );

CREATE POLICY "Sellers can update own items" ON public.marketplace_items
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own items" ON public.marketplace_items
  FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all items" ON public.marketplace_items
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
