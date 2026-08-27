const supabase = require('../config/supabase');

// Simple in-memory cache for auth tokens
// Reduces 200-500ms latency per request by avoiding repeated Supabase calls
const tokenCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // 1. Check Cache
            if (tokenCache.has(token)) {
                const cached = tokenCache.get(token);
                if (Date.now() < cached.expiry) {
                    req.user = cached.user;
                    return next();
                }
                tokenCache.delete(token); // Expired
            }

            // 2. Verify with Supabase (Network Call)
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error || !user) {
                throw new Error('Not authorized');
            }

            // 3. Cache valid result
            // Cleanup cache if too large
            if (tokenCache.size > 500) tokenCache.clear();

            tokenCache.set(token, {
                user,
                expiry: Date.now() + CACHE_TTL
            });

            req.user = user;
            next();
        } catch (error) {
            console.error('Auth check failed:', error.message);
            res.status(401).json({ message: 'Not authorized' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
