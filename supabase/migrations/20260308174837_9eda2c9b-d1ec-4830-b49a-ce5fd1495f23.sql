-- Update auto_assign_admin to use support@skycart.xyz instead of contact@skycart.xyz
CREATE OR REPLACE FUNCTION public.auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'support@skycart.xyz' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET subscription_tier = 'infinity' WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Add RLS policy for newsletter_subscribers so admins can read them
CREATE POLICY "Admins can read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
