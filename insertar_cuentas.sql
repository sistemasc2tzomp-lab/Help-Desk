-- =========================================================================
-- SCRIPT DE INSERCIÓN MASIVA DE DEPARTAMENTOS Y USUARIOS (SEGURO CONTRA 500)
-- =========================================================================

DO $$
DECLARE
    -- Variables para el loop
    r RECORD;
    depto_id UUID;
    user_uuid UUID;
    
    -- Definimos los colores base para darles un aspecto UI agradable
    colores TEXT[] := ARRAY['#0891B2', '#059669', '#D97706', '#7C3AED', '#1D4ED8', '#065F46', '#B45309', '#0F766E', '#1E40AF', '#6B21A8', '#047857', '#166534', '#92400E', '#1E3A5F', '#991B1B', '#365314', '#312E81'];
    idx INT := 1;
BEGIN
    FOR r IN (
        SELECT * FROM (
            VALUES 
                ('DIF', 'dif@helpdesk.tzomp', 'DIF@Tzomp2024'),
                ('Seguridad Pública', 'segpub@helpdesk.tzomp', 'SegPub@Tzomp2024'),
                ('Industria y Comercio', 'industria@helpdesk.tzomp', 'Industria@Tzomp2024'),
                ('Registro Civil', 'registrocivil@helpdesk.tzomp', 'RegCivil@Tzomp2024'),
                ('Obras Públicas', 'obras@helpdesk.tzomp', 'Obras@Tzomp2024'),
                ('Secretaría', 'secretaria@helpdesk.tzomp', 'Secretaria@Tzomp2024'),
                ('Juez Municipal', 'juzgado@helpdesk.tzomp', 'Juzgado@Tzomp2024'),
                ('Sindicatura', 'sindicatura@helpdesk.tzomp', 'Sindicatura@Tzomp2024'),
                ('Cajas', 'cajas@helpdesk.tzomp', 'Cajas@Tzomp2024'),
                ('Oficialía de Partes', 'oficialia@helpdesk.tzomp', 'Oficialia@Tzomp2024'),
                ('Tesorería', 'tesoreria@helpdesk.tzomp', 'Tesoreria@Tzomp2024'),
                ('Regiduría', 'regiduria@helpdesk.tzomp', 'Regiduria@Tzomp2024'),
                ('Salud', 'salud@helpdesk.tzomp', 'Salud@Tzomp2024'),
                ('Ecología', 'ecologia@helpdesk.tzomp', 'Ecologia@Tzomp2024'),
                ('Gestión Social', 'gestionsocial@helpdesk.tzomp', 'GestionSocial@Tzomp2024'),
                ('Educación, Cultura y Turismo', 'educacion@helpdesk.tzomp', 'Educacion@Tzomp2024'),
                ('Deportes', 'deportes@helpdesk.tzomp', 'Deportes@Tzomp2024'),
                ('Fomento Agropecuario', 'agropecuario@helpdesk.tzomp', 'Agropecuario@Tzomp2024'),
                ('Dirección de Planeación', 'planeacion@helpdesk.tzomp', 'Planeacion@Tzomp2024')
        ) AS tabla(nombre_depto, email, password)
    )
    LOOP
        -- 1. Insertar el departamento si no existe y obtener su ID
        INSERT INTO public.departamentos (nombre, background_color, text_color, icon, descripcion)
        VALUES (r.nombre_depto, colores[idx], '#FFFFFF', 'building', 'Departamento de ' || r.nombre_depto)
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id INTO depto_id;
        
        -- Si no retornó por el ON CONFLICT, obtengamos su id
        IF depto_id IS NULL THEN
            SELECT id INTO depto_id FROM public.departamentos WHERE nombre = r.nombre_depto;
        END IF;

        -- 2. Verificar si el usuario ya existe en auth.users
        SELECT id INTO user_uuid FROM auth.users WHERE email = r.email;
        
        IF user_uuid IS NULL THEN
            -- Generar nuevo UUID para el usuario
            user_uuid := gen_random_uuid();
            
            -- Insertar en auth.users con encriptación correcta de BCRYPT
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, 
                email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000', user_uuid, 'authenticated', 'authenticated', r.email, crypt(r.password, gen_salt('bf')),
                now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}',
                now(), now(), '', '', '', ''
            );
            
            -- Insertar identidad requerida para evitar errores 500 (con email_verified = true)
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
            )
            VALUES (
                user_uuid, user_uuid, format('{"sub":"%s", "email":"%s", "email_verified": true, "provider_id":"%s"}', user_uuid, r.email, r.email)::jsonb,
                'email', now(), now(), now(), r.email
            );
        ELSE 
            -- Si ya existe, actualizamos la contraseña por si acaso y forzamos confirmación
            UPDATE auth.users 
            SET encrypted_password = crypt(r.password, gen_salt('bf')),
                email_confirmed_at = now()
            WHERE id = user_uuid;
            
            -- Aseguramos que la identidad tiene email_verified=true (esto evita el error 500)
            UPDATE auth.identities
            SET identity_data = jsonb_set(identity_data, '{email_verified}', 'true'::jsonb)
            WHERE user_id = user_uuid;
        END IF;

        -- 3. Insertar o actualizar el perfil público asociado al usuario (Vinculando con el departamento)
        INSERT INTO public.perfiles (id, nombre, email, rol, activo, departamento_id)
        VALUES (user_uuid, r.nombre_depto, r.email, 'usuario', true, depto_id)
        ON CONFLICT (id) DO UPDATE SET 
            nombre = EXCLUDED.nombre,
            rol = 'usuario',
            activo = true,
            departamento_id = EXCLUDED.departamento_id;
            
        -- Incrementar índice de colores (si supera 17 vuelve al 1)
        idx := idx + 1;
        IF idx > 17 THEN idx := 1; END IF;
        
    END LOOP;
    
    RAISE NOTICE '¡Todos los departamentos y usuarios han sido creados e insertados con éxito!';
END $$;
