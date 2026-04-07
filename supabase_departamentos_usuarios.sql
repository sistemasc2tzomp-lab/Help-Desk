-- =============================================
-- SCRIPT V14 - REPARACIÓN DE ESQUEMA Y RECREACIÓN
-- =============================================
-- 1. REPARAR PERMISOS DEL MOTOR DE AUTH
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO postgres, anon, authenticated, service_role;

DO $$
DECLARE
    v_email TEXT := 'industria@helpdesk.tzomp';
    v_pass TEXT := 'Industri@2026';
    v_user_id UUID;
    v_dept_id UUID;
BEGIN
    -- 2. LIMPIEZA TOTAL
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NOT NULL THEN
        DELETE FROM auth.identities WHERE user_id = v_user_id;
        DELETE FROM public.perfiles WHERE id = v_user_id;
        DELETE FROM auth.users WHERE id = v_user_id;
    END IF;

    -- 3. RECREACIÓN ATÓMICA
    v_user_id := gen_random_uuid();
    SELECT id INTO v_dept_id FROM public.departamentos WHERE nombre ILIKE '%Industria%' LIMIT 1;
    IF v_dept_id IS NULL THEN SELECT id INTO v_dept_id FROM public.departamentos LIMIT 1; END IF;

    -- auth.users
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

    -- auth.identities
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        v_user_id, v_user_id, 
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true), 
        'email', v_email, NOW(), NOW(), NOW()
    );

    -- public.perfiles
    INSERT INTO public.perfiles (id, nombre, email, rol, departamento_id)
    VALUES (v_user_id, 'Dpto. Industria y Comercio', v_email, 'usuario', v_dept_id);

    RAISE NOTICE 'V14: Reparación profunda completada. Intente login ahora.';
END $$;
