-- SCRIPT PARA DEDUPLICAR DEPARTAMENTOS Y CORREGIR RELACIONES
-- Este script elimina departamentos repetidos, pero antes migra los usuarios
-- y los tickets al departamento original para no perder información.

-- PASO 1: Crear tabla temporal con el mapeo de duplicados (se queda con el más antiguo)
CREATE TEMP TABLE depto_mapeo AS
WITH department_ranked AS (
  SELECT id, nombre, ROW_NUMBER() OVER(PARTITION BY TRIM(nombre) ORDER BY creado_en ASC) as rn
  FROM public.departamentos
),
buenas AS ( SELECT id as id_buen, TRIM(nombre) as nombre FROM department_ranked WHERE rn = 1 ),
malas AS ( SELECT id as id_mala, TRIM(nombre) as nombre FROM department_ranked WHERE rn > 1 )
SELECT m.id_mala, b.id_buen 
FROM malas m JOIN buenas b ON m.nombre = b.nombre;

-- PASO 2: Actualizar usuarios (perfiles) que apuntan a un departamento duplicado
UPDATE public.perfiles p
SET departamento_id = m.id_buen
FROM depto_mapeo m
WHERE p.departamento_id = m.id_mala;

-- PASO 3: Actualizar tickets que apuntan a un departamento duplicado
UPDATE public.tickets t
SET departamento_id = m.id_buen
FROM depto_mapeo m
WHERE t.departamento_id = m.id_mala;

-- PASO 4: Eliminar de manera segura los registros duplicados de departamentos
DELETE FROM public.departamentos
WHERE id IN (SELECT id_mala FROM depto_mapeo);

-- PASO 5: Prevenir que vuelva a suceder en el futuro (Añadir Constricción Única)
ALTER TABLE public.departamentos DROP CONSTRAINT IF EXISTS uq_departamentos_nombre;
ALTER TABLE public.departamentos ADD CONSTRAINT uq_departamentos_nombre UNIQUE (nombre);

-- PASO 6: Limpiar la memoria
DROP TABLE depto_mapeo;
