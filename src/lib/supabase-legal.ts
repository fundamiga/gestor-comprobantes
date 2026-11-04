import { createClient } from '@supabase/supabase-js';

// Cliente separado para la Biblioteca de Documentos Legales de Fundamiga.
// Usa su propio proyecto Supabase independiente del sistema de comprobantes.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_LEGAL_URL ||
  'https://twtiosodoaqxjlljiiin.supabase.co';
const key =
  process.env.NEXT_PUBLIC_SUPABASE_LEGAL_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dGlvc29kb2FxeGpsbGppaWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTI5MzIsImV4cCI6MjEwNDM4ODkzMn0.HvPtHyuTGsayTIekDNVqpLNuk4SjBjJmZt9S8RJD-38';

export const supabaseLegal = createClient(url, key);

