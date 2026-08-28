import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 'https://yfhpubzwhrvvyspswizj.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaHB1Ynp3aHJ2dnlzcHN3aXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzA2OTcsImV4cCI6MjA5NzQ0NjY5N30.vPCSohWRyqsAnvjZD1ux4f1CldwmWGRg8IDI0N4j6XE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
