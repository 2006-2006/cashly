// Server Entry Point - Updated
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
// const connectDB = require('./config/db');

dotenv.config();

// connectDB();


const app = express();

// CORS - Dynamic Origin Support
app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins in development or from Vercel/Localhost
        if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            callback(null, true); // Fallback to allow for now to prevent block
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));



app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'Cashly API is running', version: '1.0.0' });
});

// Legacy Mongo Routes - Disabled for Pure Supabase
// app.use('/api/users', require('./routes/userRoutes'));
// app.use('/api/businesses', require('./routes/businessRoutes'));
// app.use('/api/recurring', require('./routes/recurringRoutes'));
// app.use('/api/collaboration', require('./routes/collaborationRoutes'));

// Active Supabase Routes
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/forecast', require('./routes/forecastRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/data', require('./routes/dataRoutes'));
app.use('/api/copilot', require('./routes/copilotRoutes'));
app.use('/api/config', require('./routes/configRoutes'));
app.use('/api/reconcile', require('./routes/reconcileRoutes'));

// Templates endpoint
const { getAllTemplates, applyTemplate } = require('./utils/templates');
app.get('/api/templates', (req, res) => {
    res.json(getAllTemplates());
});
app.get('/api/templates/:key', (req, res) => {
    const result = applyTemplate(req.params.key);
    if (result) {
        res.json(result);
    } else {
        res.status(404).json({ message: 'Template not found' });
    }
});

// Localization endpoint
const { getTranslations } = require('./utils/localization');
app.get('/api/translations/:lang', (req, res) => {
    res.json(getTranslations(req.params.lang));
});

// Basic error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
