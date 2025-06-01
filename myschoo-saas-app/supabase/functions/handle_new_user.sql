-- Function to handle new user sign-up (both self-signup and admin-invited)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_tenant_id UUID;
  final_role TEXT;
  final_full_name TEXT;
  user_email TEXT;

  -- Variables to capture invited user details from raw_app_meta_data
  invited_tenant_id_text TEXT;
  invited_role_text TEXT;
  invited_full_name_text TEXT;

BEGIN
  user_email := NEW.email;

  -- Check if the user was invited by an admin (via raw_app_meta_data set by Edge Function)
  invited_tenant_id_text := NEW.raw_app_meta_data->>'invited_tenant_id';
  invited_role_text := NEW.raw_app_meta_data->>'invited_role';
  invited_full_name_text := NEW.raw_app_meta_data->>'invited_full_name';

  IF invited_tenant_id_text IS NOT NULL AND invited_role_text IS NOT NULL THEN
    -- User was invited by an admin
    final_tenant_id := invited_tenant_id_text::UUID;
    final_role := invited_role_text;
    IF invited_full_name_text IS NOT NULL AND invited_full_name_text <> '' THEN
      final_full_name := invited_full_name_text;
    ELSE
      final_full_name := split_part(user_email, '@', 1); -- Default full_name from email prefix
    END IF;
    -- is_active will be FALSE by default from table schema for invited users

    -- Optional: Log that an invited user's profile is being created
    -- RAISE LOG 'Invited user profile creation for email % with role % in tenant %', user_email, final_role, final_tenant_id;

  ELSE
    -- Regular self-signup: create a new tenant, user becomes admin of this new tenant
    INSERT INTO public.tenants (name)
    VALUES ('School for ' || user_email)
    RETURNING id INTO final_tenant_id;

    final_role := 'admin';
    final_full_name := split_part(user_email, '@', 1); -- Default full_name from email prefix
    -- is_active will be FALSE by default. User needs to complete profile/activation.

    -- Optional: Log that a self-signed up user's profile and new tenant are being created
    -- RAISE LOG 'Self-signup user profile creation for email % with role % in new tenant %', user_email, final_role, final_tenant_id;
  END IF;

  -- Create the user profile
  -- is_active defaults to FALSE as per table definition.
  -- For self-signed up admins, they will activate their account via a client-side flow.
  -- For invited users, they are also inactive until they complete profile setup / are activated by an admin.
  INSERT INTO public.user_profiles (id, tenant_id, email, role, full_name)
  VALUES (NEW.id, final_tenant_id, user_email, final_role, final_full_name)
  ON CONFLICT (id) DO UPDATE SET -- In case of re-invite or race condition
    tenant_id = EXCLUDED.tenant_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    updated_at = now(); -- Update timestamp if record already existed

  -- Update auth.users table with the definitive tenant_id and role for JWT claims.
  -- Remove the temporary 'invited_*' fields.
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    - 'invited_tenant_id'
    - 'invited_role'
    - 'invited_full_name'
    || jsonb_build_object(
        'tenant_id', final_tenant_id::text,
        'role', final_role
       )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger to call handle_new_user on new user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user sign-ups. If user is invited (via raw_app_meta_data), assigns them to the specified tenant and role. Otherwise, creates a new tenant and assigns the user as admin. Sets user profile as inactive by default.';
