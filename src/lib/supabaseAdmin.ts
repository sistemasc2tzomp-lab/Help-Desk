/**
 * supabaseAdmin.ts
 * 
 * En lugar de crear un cliente Supabase separado (lo que causaba el warning
 * "Multiple GoTrueClient instances detected"), reutilizamos el cliente
 * singleton de supabase.ts.
 * 
 * La función getAdminSupabase() es un alias del cliente principal.
 * El registro de usuarios nuevos (signUp) ya no se puede hacer desde el
 * cliente anon — se debe hacer desde el panel de Supabase o mediante
 * una Edge Function con la service_role key.
 */
import { getSupabase, isSupabaseConfigured } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export const getAdminSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  // Reutilizar el singleton - elimina el warning de GoTrueClient duplicado
  return getSupabase();
};
