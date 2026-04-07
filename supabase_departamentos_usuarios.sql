-- =============================================
-- SCRIPT V16 - SANACIÓN DEL MOTOR AUTH (FIX 500)
-- =============================================
-- Este script restaura los permisos críticos que el motor
-- de Supabase necesita para dejar de dar error de esquema.

-- 1. Permisos de Esquema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role, authenticator;

-- 2. Permisos de Tablas para Roles de Sistema
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres, service_role;

-- 3. Permisos específicos para el rol que procesa el login (authenticator)
GRANT SELECT ON auth.users, auth.identities TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.refresh_tokens, auth.sessions, auth.instances TO authenticator;

-- 4. Notificar a PostgREST que recargue el esquema (esto fuerza la limpieza del cache)
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    -- Limpiar cualquier sesión residual que pueda estar causando el 500
    DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'industria@helpdesk.tzomp');
    RAISE NOTICE 'V16: Permisos restaurados y cache notificado. Intente login ahora.';
END $$;
