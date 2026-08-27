const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://vewyrnalcsnuldqvueqz.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZld3lybmFsY3NudWxkcXZ1ZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY1ODUsImV4cCI6MjA4MjE3MjU4NX0.s-cUvQSbyW358oXy9PQ8ma7hQtmsNOyxgm9hn1n59Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple memory cache for authenticated clients
const clientCache = new Map();

// Attach helper to create/reuse RLS-compatible client with user credentials
supabase.getAuthenticatedClient = (token) => {
    if (clientCache.has(token)) {
        return clientCache.get(token);
    }

    const client = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Cache for 5 minutes (simple cleanup to avoid memory leak)
    clientCache.set(token, client);
    setTimeout(() => clientCache.delete(token), 5 * 60 * 1000);

    return client;
};

module.exports = supabase;
