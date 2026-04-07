-- ===================================
-- SCRIPT V12 - CON METADATOS SISTEMA
-- ===================================
DO $$
DECLARE
  v_email TEXT := 'industria@helpdesk.tzomp'; 
  v_pass TEXT := 'Industri@2026';
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  -- 1. Actualizar auth.users con metadatos requeridos por GoTrue
  UPDATE auth.users SET 
    encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf', 10)),
    email_confirmed_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{}'::jsonb,
    role = 'authenticated',
    aud = 'authenticated',
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 2. Asegurar identidad limpia
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, 
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_user_id, v_user_id, 
    jsonb_build_object(
        'sub', v_user_id::text, 
        'email', v_email,
        'email_verified', true
    ), 
    'email', 
    v_email, 
    NOW(), 
    NOW(), 
    NOW()
  );

  RAISE NOTICE 'V12 Aplicada Correctamente. Metadatos de sistema actualizados.';
END $$;
