import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({
    // Force relative path on Vercel to avoid 'localhost' errors from misconfigured Dashboard vars
    baseURL: (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
        ? '/api'
        : (import.meta.env.VITE_API_URL || '/api'),
});

let cachedToken = null;
let tokenExpiry = 0;

api.interceptors.request.use(async (config) => {
    // Only refresh session if we don't have a token or it's potentially expired
    if (!cachedToken || Date.now() > tokenExpiry - 60000) {
        const { data } = await supabase.auth.getSession();
        cachedToken = data.session?.access_token;
        tokenExpiry = data.session?.expires_at ? data.session.expires_at * 1000 : 0;
    }

    if (cachedToken) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
});

export default api;
