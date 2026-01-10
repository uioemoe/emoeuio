// Supabase Configuration
const SUPABASE_URL = 'https://fhsfaivfdiqcqblcaccx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc2ZhaXZmZGlxY3FibGNhY2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTk4MTcsImV4cCI6MjA4MjkzNTgxN30.uaiCP034sa-bkChGLnrUYXcJxFDA-tf9LjydGPhMIME';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabaseClient };