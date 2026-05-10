
REVOKE EXECUTE ON FUNCTION public.flag_block_summary(TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.flag_block_timeline(TIMESTAMPTZ, INTERVAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flag_block_summary(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_block_timeline(TIMESTAMPTZ, INTERVAL) TO authenticated;
