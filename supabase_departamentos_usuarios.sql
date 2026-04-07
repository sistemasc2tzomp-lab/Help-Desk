-- =============================================
-- SCRIPT V13 - RESETEU INTEGRAL DE SEGURIDAD
-- =============================================
DO $$
DECLARE
  v_email TEXT := 'industria@helpdesk.tzomp'; 
  v_pass TEXT := 'Industri@2026';
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  -- 1. Reseteo total de parámetros en auth.users
  UPDATE auth.users SET 
    instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated',
    role = 'authenticated',
    encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf', 10)),
    email_confirmed_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{}'::jsonb,
    is_super_admin = false,
    confirmation_token = '',
    email_change_token_current = '',
    email_change_confirm_status = 0,
    is_sso_user = false,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 2. Asegurar link de identidad
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_user_id, v_user_id, 
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true), 
    'email', v_email, NOW(), NOW(), NOW()
  );

  RAISE NOTICE 'V13 Aplicada. Reseteo integral completo.';
END $$;
