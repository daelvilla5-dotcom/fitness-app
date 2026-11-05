import { createClient } from '@supabase/supabase-js'

// Sostituisci con i tuoi valori reali
const supabaseUrl = 'https://sqswltdveakdgheibqjw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxc3dsdGR2ZWFrZGdoZWlicWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MzAzMDEsImV4cCI6MjEwOTQwNjMwMX0.ZbHtX3LE6e-GzWacReyvjV8uojU0U_RK8p9bzn2klpU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)