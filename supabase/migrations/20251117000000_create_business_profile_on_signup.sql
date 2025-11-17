-- Update handle_new_user function to create business_profiles entry automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile entry
  INSERT INTO public.profiles (
    id, 
    email, 
    business_name, 
    owner_name, 
    location, 
    business_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'business_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'owner_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'location', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'business_type', '')
  );

  -- Create business_profiles entry with data from signup
  INSERT INTO public.business_profiles (
    user_id,
    business_name,
    owner_name,
    business_address,
    business_type,
    email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'business_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'owner_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'business_address', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'business_type', ''),
    NEW.email
  );

  RETURN NEW;
END;
$$;
