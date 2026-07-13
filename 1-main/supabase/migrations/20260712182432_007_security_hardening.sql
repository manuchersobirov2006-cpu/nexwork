/*
# Security hardening

## Issues fixed
1. Function `generate_public_id` search_path mutable — set `search_path = public` on the function.
2. Public bucket `avatars` broad SELECT policy allows listing all files — drop it; `getPublicUrl` doesn't need RLS.
3. Public bucket `service-images` broad SELECT policy allows listing all files — drop it.
4. `anon` can execute `generate_public_id()` SECURITY DEFINER — revoke EXECUTE from anon and authenticated; only service_role (triggers) needs it.
5. `anon` can execute `handle_new_user()` SECURITY DEFINER — revoke EXECUTE from anon and authenticated; only service_role (triggers) needs it.

## Notes
- `getPublicUrl()` generates a URL without querying `storage.objects` — no SELECT policy needed for public buckets.
- Client code uses only `upload`, `remove`, and `getPublicUrl` on these buckets — no `.list()` calls.
- `generate_public_id` is called only by the `profiles_public_id` trigger (runs as service_role), not by client RPC.
- `handle_new_user` is called only by the auth trigger on new user creation, not by client RPC.
*/

-- 1. Fix mutable search_path on generate_public_id
ALTER FUNCTION public.generate_public_id() SET search_path = public;

-- 2. Drop broad SELECT policies on public buckets (prevents listing)
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS service_images_public_read ON storage.objects;

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from anon and authenticated
--    These are trigger-only functions; only service_role needs access.
REVOKE EXECUTE ON FUNCTION public.generate_public_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
