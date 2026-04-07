-- ============================================================
-- HELP DESK TZOMPANTEPEC — Script Final de Producción
-- ============================================================

-- 1. Crear departamentos si no existen
INSERT INTO public.departamentos (nombre, descripcion, color) VALUES
  ('Industria y Comercio', 'Departamento de Industria, Comercio y Servicio', '#0891B2'),
  ('Registro Civil', 'Departamento del Registro Civil Municipal', '#059669'),
  ('Obras Públicas', 'Dirección de Obras Públicas y Desarrollo Urbano', '#D97706'),
  ('Secretaría', 'Secretaría del Ayuntamiento', '#7C3AED'),
  ('Tesorería', 'Tesorería y Finanzas Municipales', '#1E40AF'),
  ('Servicios Públicos', 'Coordinación de Servicios Públicos Municipales', '#0284C7'),
  ('Seguridad Pública', 'Dirección de Seguridad Pública Municipal', '#B91C1C'),
  ('Protección Civil', 'Coordinación Municipal de Protección Civil', '#EA580C'),
  ('DIF Municipal', 'Sistema Municipal para el Desarrollo Integral de la Familia', '#DB2777'),
  ('Cultura y Deporte', 'Coordinación de Cultura y Deporte', '#4F46E5'),
  ('Agua Potable', 'Comisión de Agua Potable y Alcantarillado', '#2563EB'),
  ('Ecología', 'Departamento de Ecología y Medio Ambiente', '#16A34A'),
  ('Jurídico', 'Departamento Jurídico Municipal', '#475569'),
  ('Comunicación Social', 'Coordinación de Comunicación Social', '#6366F1'),
  ('Planeación', 'Departamento de Planeación y Evaluación', '#0F172A'),
  ('Salud', 'Coordinación de Salud Municipal', '#E11D48'),
  ('Desarrollo Rural', 'Coordinación de Desarrollo Rural y Agropecuario', '#15803D')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Función maestra para crear usuarios compatibles con Supabase Auth (BCrypt Cost 10)
CREATE OR REPLACE FUNCTION crear_usuario_departamento(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_dept_nombre TEXT
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  -- Obtener el ID del departamento
  SELECT id INTO v_dept_id FROM public.departamentos WHERE nombre = p_dept_nombre LIMIT 1;
  
  -- Verificar si el usuario ya existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  -- Si no existe, lo creamos con el formato exacto de Supabase
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, aud, role
    ) VALUES (
      v_user_id, p_email, 
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)), -- Cost 10 fundamental
      NOW(),
      '{"provider":"email","providers":["email"],"role":"usuario"}'::jsonb,
      jsonb_build_object('full_name', p_nombre, 'role', 'usuario'),
      'authenticated', 'authenticated'
    );
  ELSE
    -- Si ya existe, actualizamos su contraseña y metadatos por si acaso
    UPDATE auth.users SET 
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      raw_user_meta_data = jsonb_build_object('full_name', p_nombre, 'role', 'usuario')
    WHERE id = v_user_id;
  END IF;

  -- Esperamos un segundo para que los triggers automáticos de Supabase corran (on_auth_user_created)
  -- Y luego aseguramos que el perfil tenga el departamento correcto
  PERFORM pg_sleep(0.1); 
  
  UPDATE public.perfiles SET 
    nombre = p_nombre,
    departamento_id = v_dept_id,
    rol = 'usuario',
    activo = TRUE
  WHERE id = v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ejemplo de ejecución para Industria (Puedes repetir para todos los demás)
SELECT crear_usuario_departamento('industria@helpdesk.tzomp', 'Industri@2026', 'Responsable Industria y Comercio', 'Industria y Comercio');

-- 4. Verificación
SELECT p.email, d.nombre as departamento, p.rol 
FROM public.perfiles p 
JOIN public.departamentos d ON d.id = p.departamento_id 
WHERE p.email = 'industria@helpdesk.tzomp';
