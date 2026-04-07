-- =============================================
-- SCRIPT V15 - COMPATIBLE CON DISPARADORES
-- =============================================
DO $$
DECLARE
    v_email TEXT := 'industria@helpdesk.tzomp';
    v_pass TEXT := 'Industri@2026';
    v_user_id UUID;
    v_dept_id UUID;
BEGIN
    -- 1. LIMPIEZA ATÓMICA
    -- Primero buscamos si existe un usuario con ese email
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NOT NULL THEN
        DELETE FROM auth.identities WHERE user_id = v_user_id;
        DELETE FROM public.perfiles WHERE id = v_user_id;
        DELETE FROM auth.users WHERE id = v_user_id;
    END IF;

    -- 2. GENERAR NUEVO ID
    v_user_id := gen_random_uuid();
    
    -- Buscar departamento correlacionado
    SELECT id INTO v_dept_id FROM public.departamentos WHERE nombre ILIKE '%Industria%' LIMIT 1;
    IF v_dept_id IS NULL THEN SELECT id INTO v_dept_id FROM public.departamentos LIMIT 1; END IF;

    -- Insertar en auth.users
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, confirmation_token, is_sso_user
    ) VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        v_email, extensions.crypt(v_pass, extensions.gen_salt('bf', 10)),
        NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        NOW(), NOW(), '', false
    );

    -- Insertar en identidades
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        v_user_id, v_user_id, 
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true), 
        'email', v_email, NOW(), NOW(), NOW()
    );

    -- 3. SINCRONIZAR PERFIL (Evitando conflicto con triggers automáticos)
    INSERT INTO public.perfiles (id, nombre, email, rol, departamento_id)
    VALUES (v_user_id, 'Industria y Comercio', v_email, 'usuario', v_dept_id)
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        rol = EXCLUDED.rol,
        departamento_id = EXCLUDED.departamento_id;

    RAISE NOTICE 'V15 Ejecutada con éxito. Pruebe el login ahora.';
END $$;
