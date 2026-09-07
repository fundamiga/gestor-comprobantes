import { createClient } from '@supabase/supabase-js';

// Cliente separado para la Biblioteca de Documentos Legales de Fundamiga.
// Usa su propio proyecto Supabase independiente del sistema de comprobantes.
const url = process.env.NEXT_PUBLIC_SUPABASE_LEGAL_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_LEGAL_ANON_KEY || '';

export const supabaseLegal = createClient(url, key);
