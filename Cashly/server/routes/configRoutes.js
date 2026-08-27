const express = require('express');
const router = express.Router();

router.get('/supabase', (req, res) => {
    res.json({
        url: process.env.SUPABASE_URL || 'https://vewyrnalcsnuldqvueqz.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZld3lybmFsY3NudWxkcXZ1ZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTY1ODUsImV4cCI6MjA4MjE3MjU4NX0.s-cUvQSbyW358oXy9PQ8ma7hQtmsNOyxgm9hn1n59Cs'
    });
});

module.exports = router;
