-- ==========================================
-- SCRIPT DE AJUSTE FINAL (V10) - LOGIN SUPABASE
-- ==========================================
-- Este script corrige la identidad y metadatos de un usuario
-- para asegurar que Supabase permita el acceso inmediato.

DO $$
DECLARE
  v_email TEXT := 'industria@helpdesk.tzomp'; -- Cambiar por el email deseado
  v_user_id UUID;
BEGIN
  -- 1. Obtener el ID del usuario
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'El usuario % no existe. Primero créalo.', v_email;
    RETURN;
  END IF;

  -- 2. Limpiar y re-configurar la tabla auth.users
  UPDATE auth.users SET 
    email_confirmed_at = NOW(),
    role = 'authenticated',
    aud = 'authenticated',
    confirmed_at = NOW(),
    is_super_admin = FALSE,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- 3. Borrar identidades previas para evitar conflictos
  DELETE FROM auth.identities WHERE user_id = v_user_id;

  -- 4. Crear la identidad definitiva con metadatos de verificación
  INSERT INTO auth.identities (
    id, 
    user_id, 
    identity_data, 
    provider, 
    provider_id, 
    last_sign_in_at, 
    created_at, 
    updated_at
  )
  VALUES (
    v_user_id, 
    v_user_id, 
    jsonb_build_object(
        'sub', v_user_id::text, 
        'email', v_email,
        'email_verified', true  -- CAMPO CLAVE PARA LOGIN DIRECTO
    ), 
    'email', 
    v_email, -- Para el proveedor 'email', el provider_id es el email.
    NOW(), 
    NOW(), 
    NOW()
  );

  RAISE NOTICE 'Configuración V10 aplicada para %. Intente el login ahora.', v_email;
END $$;
