REVOKE ALL ON FUNCTION public.create_workspace(text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_workspace(text, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_workspace(text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace(text, text, text, uuid) TO service_role;