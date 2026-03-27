import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iylubgxnjclipcecpcdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5bHViZ3huamNsaXBjZWNwY2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg3NDAsImV4cCI6MjA4NzYwNDc0MH0.azpYU-qfAzEICXCVRutXz6_k5hkdyuRmPT0fZwVnGro';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
