-- Ejecuta este script en el Editor SQL de Supabase para activar los folios secuenciales

-- 1. Crear una secuencia para los tickets (iniciará en 1 y autoincrementará)
CREATE SEQUENCE IF NOT EXISTS ticket_folio_seq START 1;

-- 2. Añadir la columna de 'folio' a la tabla tickets si no existe
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS folio INTEGER DEFAULT nextval('ticket_folio_seq');

-- 3. Asegurar que los tickets existentes tengan un número de folio (en caso de que hayan nulls)
UPDATE public.tickets SET folio = nextval('ticket_folio_seq') WHERE folio IS NULL;

-- 4. Opcional: Hacer la columna folio única para evitar duplicados
ALTER TABLE public.tickets ADD CONSTRAINT unique_ticket_folio UNIQUE (folio);

-- (Opcional) Trigger por si no toma el default al hacer insert desde la web
CREATE OR REPLACE FUNCTION set_ticket_folio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL THEN
    NEW.folio := nextval('ticket_folio_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ticket_folio ON public.tickets;

CREATE TRIGGER trg_set_ticket_folio
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION set_ticket_folio();
