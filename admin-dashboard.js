// MINIMAL TEST VERSION - admin-dashboard.js
console.log('✅ admin-dashboard.js STARTING');

const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';

try {
    console.log('✅ Creating Supabase client');
    const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created');
} catch (error) {
    console.error('❌ Supabase creation failed:', error);
}

console.log('✅ admin-dashboard.js LOADED COMPLETELY');
