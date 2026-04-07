-- ===========================================
-- SCRIPT DE AJUSTE FINAL (V11) - SIN GENERADOS
-- ===========================================
DO $$
DECLARE
  v_email TEXT := 'industria@helpdesk.tzomp'; 
  v_user_id UUID;
BEGIN
  -- 1. Obtener el ID del usuario
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'El usuario % no existe.', v_email;
    RETURN;
  END IF;

  -- 2. Actualizar auth.users SIN tocar columnas generadas (como confirmed_at)
  UPDATE auth.users SET 
    email_confirmed_at = NOW(),
    role = 'authenticated',
    aud = 'authenticated',
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 3. Limpiar identidades previas
  DELETE FROM auth.identities WHERE user_id = v_user_id;

  -- 4. Crear la identidad definitiva
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, 
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_user_id, 
    v_user_id, 
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

  RAISE NOTICE 'Configuración V11 (Fix Generados) aplicada para %. Prueba el login ahora.', v_email;
END $$;
