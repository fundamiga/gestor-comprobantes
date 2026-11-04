import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://cffsosbcmmeabiftjzyg.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZnNvc2JjbW1lYWJpZnRqenlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQzMzYsImV4cCI6MjA5NDczMDMzNn0.npwz0_r8j2byZ8e4vUQ-0c2ITVa1Cdr8adVR_cpgVJA';

export const supabase = createClient(supabaseUrl, supabaseKey);

