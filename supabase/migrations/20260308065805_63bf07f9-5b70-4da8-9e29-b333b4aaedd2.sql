
-- Auto-assign admin role to contact@skycart.xyz
CREATE OR REPLACE FUNCTION public.auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'contact@skycart.xyz' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
    -- Also set infinity tier
    UPDATE public.profiles SET subscription_tier = 'infinity' WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin();

-- Seed default community groups
INSERT INTO public.community_groups (name, description, icon, min_tier) VALUES
  ('Web Development', 'Discuss frontend, backend, and full-stack web development', '🌐', 'pro'),
  ('App Development', 'Mobile & desktop app development discussions', '📱', 'pro'),
  ('AI & Machine Learning', 'Explore AI tools, ML models, and automation', '🤖', 'pro'),
  ('Graphic Design', 'Design tips, tools, and portfolio reviews', '🎨', 'pro'),
  ('Digital Marketing', 'SEO, social media, and growth hacking', '📈', 'pro'),
  ('Freelance Tips', 'General freelancing advice and strategies', '💡', 'free'),
  ('Elite Masterclass', 'Exclusive discussions for elite members', '👑', 'elite'),
  ('Infinity Lounge', 'Premium community for infinity members', '♾️', 'infinity');

-- Fix the permissive RLS on community_groups for INSERT/UPDATE/DELETE
-- The SELECT true is fine for read access
