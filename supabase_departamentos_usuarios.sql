-- ============================================================
-- HELP DESK TZOMPANTEPEC — Script de Departamentos y Usuarios
-- ============================================================
-- Ejecuta este script en: Supabase → SQL Editor
-- Creará los 18 departamentos municipales y sus usuarios asociados
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- PASO 1: INSERTAR DEPARTAMENTOS
-- ═══════════════════════════════════════════════════════════
-- Paleta de colores institucional variada
INSERT INTO public.departamentos (nombre, descripcion, color, creado_en) VALUES
  ('Industria y Comercio',         'Departamento de Industria, Comercio y Servicio',           '#0891B2', NOW()),
  ('Registro Civil',               'Departamento del Registro Civil Municipal',                '#059669', NOW()),
  ('Obras Públicas',               'Dirección de Obras Públicas y Desarrollo Urbano',          '#D97706', NOW()),
  ('Secretaría',                   'Secretaría del Ayuntamiento',                              '#7C3AED', NOW()),
  ('Juez Municipal',               'Juzgado Municipal de Tzompantepec',                        '#1D4ED8', NOW()),
  ('Sindicatura',                  'Sindicatura Municipal',                                    '#065F46', NOW()),
  ('Cajas',                        'Departamento de Cajas y Recaudación',                      '#B45309', NOW()),
  ('Oficialía de Partes',          'Oficialía de Partes Municipal',                            '#0F766E', NOW()),
  ('Tesorería',                    'Tesorería y Finanzas Municipales',                         '#1E40AF', NOW()),
  ('Regiduría',                    'Cuerpo de Regidores del Ayuntamiento',                     '#6B21A8', NOW()),
  ('Salud',                        'Departamento Municipal de Salud',                          '#047857', NOW()),
  ('Ecología',                     'Departamento de Ecología y Medio Ambiente',                '#166534', NOW()),
  ('Gestión Social',               'Dirección de Gestión Social y Desarrollo Comunitario',    '#92400E', NOW()),
  ('Educación, C y T',             'Departamento de Educación, Cultura, Juventud y Turismo',  '#1E3A5F', NOW()),
  ('Deportes',                     'Instituto Municipal de Cultura Física y Deporte',          '#991B1B', NOW()),
  ('Fomento A',                    'Dirección de Fomento Agropecuario y Rural',                '#365314', NOW()),
  ('Dirección de P',               'Dirección General de Planeación Municipal',                '#312E81', NOW())
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PASO 2: CREAR USUARIOS EN AUTH Y PERFILES
-- ═══════════════════════════════════════════════════════════
-- Función auxiliar para crear usuario + perfil de forma segura
CREATE OR REPLACE FUNCTION create_dept_user(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_dept_nombre TEXT,
  p_rol TEXT DEFAULT 'usuario'
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  -- Obtener ID del departamento
  SELECT id INTO v_dept_id FROM public.departamentos WHERE nombre = p_dept_nombre LIMIT 1;

  -- Check if user already exists based on email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Generate new ID
    v_user_id := gen_random_uuid();

    -- Insert into auth.users safely
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', p_rol),
      jsonb_build_object('full_name', p_nombre, 'role', p_rol),
      FALSE
    );
  END IF;

  -- Crear perfil en la tabla pública
  INSERT INTO public.perfiles (id, email, nombre, rol, departamento_id, activo, creado_en)
  VALUES (
    v_user_id,
    p_email,
    p_nombre,
    p_rol,
    v_dept_id,
    TRUE,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    departamento_id = v_dept_id,
    nombre = p_nombre,
    rol = p_rol,
    activo = TRUE;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- PASO 3: EJECUTAR CREACIÓN DE CADA USUARIO
-- Formato: email | contraseña | nombre | departamento
-- ═══════════════════════════════════════════════════════════

-- Industria y Comercio
SELECT create_dept_user('industria@helpdesk.tzomp', 'Industri@2026', 'Responsable Industria y Comercio', 'Industria y Comercio');

-- Registro Civil
SELECT create_dept_user('registrocivil@helpdesk.tzomp', 'RegC1vil2026', 'Responsable Registro Civil', 'Registro Civil');

-- Obras Públicas
SELECT create_dept_user('obras@helpdesk.tzomp', 'Obras.2026', 'Responsable Obras Públicas', 'Obras Públicas');

-- Secretaría
SELECT create_dept_user('secretaria@helpdesk.tzomp', 'Secr3taria2026', 'Responsable Secretaría', 'Secretaría');

-- Juez Municipal
SELECT create_dept_user('juzgado@helpdesk.tzomp', 'Juzg@do2026', 'Responsable Juzgado Municipal', 'Juez Municipal');

-- Sindicatura
SELECT create_dept_user('sindicatura@helpdesk.tzomp', 'Sindic@tura2026', 'Responsable Sindicatura', 'Sindicatura');

-- Cajas
SELECT create_dept_user('cajas@helpdesk.tzomp', 'Caj@s2026', 'Responsable Cajas', 'Cajas');

-- Oficialía de Partes
SELECT create_dept_user('oficialia@helpdesk.tzomp', 'Ofic1alia2026', 'Responsable Oficialía de Partes', 'Oficialía de Partes');

-- Tesorería
SELECT create_dept_user('tesoreria@helpdesk.tzomp', 'Tesoreri@2026', 'Responsable Tesorería', 'Tesorería');

-- Regiduría
SELECT create_dept_user('regiduria@helpdesk.tzomp', 'R3giduria2026', 'Responsable Regiduría', 'Regiduría');

-- Salud
SELECT create_dept_user('salud@helpdesk.tzomp', 'Salud.2026$', 'Responsable Salud', 'Salud');

-- Ecología
SELECT create_dept_user('ecologia@helpdesk.tzomp', 'Ecolog1a2026', 'Responsable Ecología', 'Ecología');

-- Gestión Social
SELECT create_dept_user('gestionsocial@helpdesk.tzomp', 'GestSoc1al2026', 'Responsable Gestión Social', 'Gestión Social');

-- Educación, Cultura y Turismo
SELECT create_dept_user('educacion@helpdesk.tzomp', 'Educ@cion2026', 'Responsable Educación y Cultura', 'Educación, C y T');

-- Deportes
SELECT create_dept_user('deportes@helpdesk.tzomp', 'D3portes2026', 'Responsable Deportes', 'Deportes');

-- Fomento Agropecuario
SELECT create_dept_user('agropecuario@helpdesk.tzomp', 'Agropecu@rio2026', 'Responsable Fomento Agropecuario', 'Fomento A');

-- Dirección de Planeación
SELECT create_dept_user('planeacion@helpdesk.tzomp', 'Plan3acion2026', 'Responsable Planeación', 'Dirección de P');


-- ═══════════════════════════════════════════════════════════
-- PASO 4: LIMPIAR (eliminar la función temporal)
-- ═══════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS create_dept_user(TEXT, TEXT, TEXT, TEXT, TEXT);


-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN — Muestra los resultados
-- ═══════════════════════════════════════════════════════════
SELECT 
  p.nombre AS "Usuario",
  p.email AS "Email",
  p.rol AS "Rol",
  d.nombre AS "Departamento"
FROM public.perfiles p
LEFT JOIN public.departamentos d ON d.id::TEXT = p.departamento_id::TEXT
ORDER BY d.nombre;
