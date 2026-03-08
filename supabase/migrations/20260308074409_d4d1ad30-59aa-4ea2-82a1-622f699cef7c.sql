
-- Webinars table
CREATE TABLE public.webinars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  meeting_id TEXT,
  meeting_pass TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'upcoming',
  target_tier TEXT NOT NULL DEFAULT 'all',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webinars" ON public.webinars
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read webinars" ON public.webinars
FOR SELECT USING (true);

-- Expert guidance assignments
CREATE TABLE public.expert_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expert_name TEXT NOT NULL,
  expert_email TEXT,
  topic TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'assigned',
  meeting_link TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  target_tier TEXT NOT NULL DEFAULT 'elite',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments" ON public.expert_assignments
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own assignments" ON public.expert_assignments
FOR SELECT USING (auth.uid() = user_id);

-- Chat messages for admin intervention
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  admin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all messages" ON public.chat_messages
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own messages" ON public.chat_messages
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON public.chat_messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contact form submissions table
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact" ON public.contact_submissions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read contacts" ON public.contact_submissions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT DEFAULT 'General',
  author_name TEXT DEFAULT 'Admin',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blogs" ON public.blog_posts
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read published blogs" ON public.blog_posts
FOR SELECT USING (is_published = true);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
