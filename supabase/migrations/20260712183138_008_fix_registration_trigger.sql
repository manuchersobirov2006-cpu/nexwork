/*
# Fix: Registration broken by gen_random_bytes not in search_path

## Root cause
`generate_public_id()` has `SET search_path = public`, but `gen_random_bytes()`
lives in the `extensions` schema. When the trigger fires (during user signup),
it can't resolve `gen_random_bytes(6)` and raises:
  ERROR: function gen_random_bytes(integer) does not exist
Supabase Auth swallows this into "Database error saving new user".

## Fix
Set `search_path = public, extensions` on `generate_public_id()` so it can
find `gen_random_bytes`. Also schema-qualify the call as a belt-and-suspenders
measure. Add retry loop with a max iteration cap to prevent infinite loops
in the unlikely event of persistent collisions.
*/

CREATE OR REPLACE FUNCTION public.generate_public_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  new_id TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.public_id IS NULL THEN
    LOOP
      new_id := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE public_id = new_id);
      attempts := attempts + 1;
      IF attempts > 100 THEN
        RAISE EXCEPTION 'Could not generate unique public_id after 100 attempts';
      END IF;
    END LOOP;
    NEW.public_id := new_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Also ensure handle_new_user can see extensions schema if needed
-- (it doesn't call gen_random_bytes directly, but the profiles trigger does)
ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions;
