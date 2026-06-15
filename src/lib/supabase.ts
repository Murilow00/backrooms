import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzautnrijdsbawlotjal.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6YXV0bnJpamRzYmF3bG90amFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzE4MzYsImV4cCI6MjA5NzEwNzgzNn0.TUU1wrU_ZlKV6wWXOig9iMTZ2nOEC-djG4jo0JnmayM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
