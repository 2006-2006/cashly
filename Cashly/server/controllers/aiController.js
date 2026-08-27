const CashlyAgent = require('../agent/agent');
const supabase = require('../config/supabase');
const { checkBusinessAccess } = require('../utils/accessControl');
// const IntelligenceService = require('../services/IntelligenceService'); // Stubbed in tools, ignore here if not critical or stub
// const IntegrationService = require('../services/IntegrationService');

// Create agent instance
const agent = new CashlyAgent();

// Generate MSME-friendly insights from forecast data
const generateInsights = (forecastData, sales, expenses, receivables) => {
    const insights = [];

    // 1. Negative balance risk dates
    const negativeDays = forecastData.filter(f => (f.projectedBalance || f.predictedCashBalance) < 0);
    if (negativeDays.length > 0) {
        insights.push({
            type: 'Risk',
            severity: 'Critical',
            title: '⚠️ Cash Shortage Alert',
            description: `Your shop may run out of money on ${negativeDays.length} day(s). First risky date: ${new Date(negativeDays[0]?.date).toLocaleDateString('en-IN')}`,
        });
    }

    // 2. Customer dependency
    if (receivables && receivables.length > 0) {
        const totalDue = receivables.reduce((sum, r) => sum + (r.amount_due || r.amountDue), 0);
        const sortedByAmount = [...receivables].sort((a, b) => (b.amount_due || b.amountDue) - (a.amount_due || a.amountDue));
        const topCustomer = sortedByAmount[0];
        const topAmt = topCustomer.amount_due || topCustomer.amountDue;
        const custName = topCustomer.customer_name || topCustomer.customerName;

        if (topCustomer && topAmt / totalDue > 0.4) {
            insights.push({
                type: 'Risk',
                severity: 'Medium',
                title: '👥 High Customer Dependency',
                description: `${custName} owes ₹${topAmt.toLocaleString('en-IN')} - that's ${Math.round(topAmt / totalDue * 100)}% of all pending money.`,
            });
        }
    }

    return insights;
};

// @desc    Generate AI insights
const generateAIInsights = async (req, res) => {
    try {
        const { businessId, forecastData } = req.body;

        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const db = token && supabase.getAuthenticatedClient ? supabase.getAuthenticatedClient(token) : supabase;

        if (businessId && req.user) await checkBusinessAccess(req.user, businessId, db);

        const [salesRes, expRes, recRes] = await Promise.all([
            db.from('sales').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(500),
            db.from('expenses').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(500),
            db.from('receivables').select('*').eq('business_id', businessId).eq('status', 'Pending')
        ]);

        const insights = generateInsights(forecastData || [], salesRes.data || [], expRes.data || [], recRes.data || []);

        // Save insights to database
        if (businessId && insights.length > 0) {
            const inserts = insights.map(i => ({ business_id: businessId, ...i, is_dismissed: false }));
            await supabase.from('insights').insert(inserts);
        }

        res.status(200).json({ insights });
    } catch (error) {
        console.error('AI Insights Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get saved insights
const getInsights = async (req, res) => {
    try {
        const { businessId } = req.query;
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const db = token && supabase.getAuthenticatedClient ? supabase.getAuthenticatedClient(token) : supabase;

        if (businessId && req.user) await checkBusinessAccess(req.user, businessId, db);

        const { data } = await db.from('insights')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_dismissed', false)
            .order('created_at', { ascending: false })
            .limit(20);

        res.status(200).json(data || []);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Natural language Q&A
const askQuestion = async (req, res) => {
    try {
        const { query, businessId, currentCash, metrics, situation } = req.body;

        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const db = token && supabase.getAuthenticatedClient ? supabase.getAuthenticatedClient(token) : supabase;

        if (businessId && req.user) await checkBusinessAccess(req.user, businessId, db);

        // Create fresh agent instance for this request
        const agent = new CashlyAgent();

        // Delegate to advance reasoning agent
        const result = await agent.run(query, {
            businessId,
            userId: req.user?.id,
            currentCash,
            token, // Pass token for RLS
            metrics, // Essential for sub-5ms path
            situation // Essential for sub-5ms path
        });

        res.status(200).json({
            response: result.response,
            query,
            classification: result.classification || { category: 'Informational', tone: 'Precise' },
            steps: result.steps || [],
            duration: result.duration,
            chartData: result.chartData,
            isFastPath: result.isFastPath
        });
    } catch (error) {
        console.error('Ask Question Error:', error);
        res.status(200).json({ // Return 200 with error message to prevent frontend crash
            response: "I encountered a system error. Please try again.",
            steps: [{ id: 1, type: 'error', message: 'System Error: ' + error.message }],
            classification: { category: 'Error', tone: 'Apologetic' }
        });
    }
};

const explainRisk = async (req, res) => {
    try {
        const { businessId } = req.query;
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const result = await agent.run('Analyze business risks', {
            businessId,
            userId: req.user?.id,
            token
        });
        res.json({
            explanation: result.response,
            steps: result.steps
        });
    } catch (error) {
        res.json({ explanation: 'Unable to analyze risks' });
    }
};

const handleGeneralQuery = async (req, res) => {
    console.log(`[AI] Request received: "${req.body.query}"`);
    try {
        const { query, businessId, metrics, situation } = req.body;
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const result = await agent.run(query || 'Give me an overview', {
            businessId,
            userId: req.user?.id,
            token,
            metrics, // Essential for sub-5ms path
            situation // Essential for sub-5ms path
        });

        return res.json({
            response: result.response,
            steps: result.steps,
            toolsUsed: result.toolsUsed,
            duration: result.duration,
            isFastPath: result.isFastPath,
            classification: result.classification || { category: 'Informational', tone: 'Precise' }
        });
    } catch (error) {
        return res.json({ response: 'Error processing query.' });
    }
};

// Get alerts
const getAlerts = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.json([]);

        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const db = token && supabase.getAuthenticatedClient ? supabase.getAuthenticatedClient(token) : supabase;

        if (req.user) await checkBusinessAccess(req.user, businessId, db);

        const { data } = await db.from('alerts')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);

        res.json(data || []);
    } catch (error) {
        res.json([]);
    }
};

// Mark alert as read
const markAlertRead = async (req, res) => {
    try {
        await supabase.from('alerts').update({ is_read: true }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Generate alerts based on forecast
const generateAlerts = async (req, res) => {
    try {
        const { businessId, forecastData, currentCash } = req.body;
        if (businessId && req.user) await checkBusinessAccess(req.user, businessId);

        const alerts = [];
        if (forecastData) {
            const lowestDay = forecastData.reduce((min, f) =>
                (f.projectedBalance || f.predictedCashBalance || 999999) < (min.projectedBalance || min.predictedCashBalance || 999999) ? f : min
                , forecastData[0]);

            const lowBal = lowestDay?.projectedBalance || lowestDay?.predictedCashBalance || 0;
            if (lowBal < 10000) {
                alerts.push({
                    business_id: businessId,
                    type: 'LowBalance',
                    severity: lowBal < 0 ? 'Critical' : 'Warning',
                    title: 'Low Cash Balance Coming',
                    message: `Balance may drop to ₹${lowBal.toLocaleString('en-IN')} on ${new Date(lowestDay.date).toLocaleDateString()}`,
                    is_read: false
                });
            }
        }

        if (alerts.length > 0) {
            await supabase.from('alerts').insert(alerts);
        }

        res.status(200).json({ alerts });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getIntelligenceGraph = async (req, res) => {
    res.json({ graph: { nodes: [], links: [] }, risk: { status: 'Module upgrading' } });
};

const getGSTProjection = async (req, res) => {
    res.json({ netPayable: 0, message: 'GST Upgrade in progress' });
};

const getSituationData = async (req, res) => {
    try {
        const { businessId } = req.params;

        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const db = token && supabase.getAuthenticatedClient ? supabase.getAuthenticatedClient(token) : supabase;

        if (req.user) await checkBusinessAccess(req.user, businessId, db);

        const [salesRes, expRes, recRes] = await Promise.all([
            db.from('sales').select('amount, date').eq('business_id', businessId),
            db.from('expenses').select('amount, date').eq('business_id', businessId),
            db.from('receivables').select('*').eq('business_id', businessId).eq('status', 'Pending')
        ]);

        const sales = salesRes.data || [];
        const expenses = expRes.data || [];
        const receivables = recRes.data || [];

        const totalSales = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // Allow frontend to pass accurate cash balance (since user might have opening balance)
        let currentCash = 0;
        if (req.query.currentBalance && !isNaN(req.query.currentBalance)) {
            currentCash = Number(req.query.currentBalance);
        } else {
            currentCash = totalSales - totalExpenses;
        }

        // --- SIMULATION LOGIC (Matched to Client Forecast System) ---
        const now = new Date();
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // 1. Calculate Averages (90 Days)
        const recentSales = sales.filter(s => new Date(s.date) >= ninetyDaysAgo);
        const totalRecentSales = recentSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const salesDates = recentSales.map(s => new Date(s.date));
        const salesSpan = salesDates.length > 0
            ? Math.max(7, Math.ceil((new Date() - new Date(Math.min(...salesDates))) / (1000 * 60 * 60 * 24)))
            : 90;
        const averageDailySales = totalRecentSales / Math.min(90, salesSpan);

        const recentExpensesList = expenses.filter(e => new Date(e.date) >= ninetyDaysAgo);
        const totalRecentExpenses = recentExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const expDates = recentExpensesList.map(e => new Date(e.date));
        const expSpan = expDates.length > 0
            ? Math.max(7, Math.ceil((new Date() - new Date(Math.min(...expDates))) / (1000 * 60 * 60 * 24)))
            : 90;
        const averageDailyExpenses = totalRecentExpenses / Math.min(90, expSpan);

        // 2. Run 30-Day Forecast Loop
        let runningCash = Number(currentCash);
        const forecastData = [];
        const days = 30;

        for (let i = 1; i <= days; i++) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + i);
            currentDate.setHours(0, 0, 0, 0);

            // Inflows
            let dailyInflow = averageDailySales;
            // Receivables
            const dayReceivables = receivables.filter(r => {
                const rDate = new Date(r.expected_payment_date || r.expectedPaymentDate || r.invoiceDate);
                return rDate.getDate() === currentDate.getDate() &&
                    rDate.getMonth() === currentDate.getMonth() &&
                    rDate.getFullYear() === currentDate.getFullYear();
            });
            dailyInflow += dayReceivables.reduce((sum, r) => sum + (Number(r.amount_due) || Number(r.amount) || 0), 0);

            // Outflows
            let dailyOutflow = averageDailyExpenses;

            // Note: Explicit future expenses are not simulated here unless passed in.
            // Using baseline average for parity with basic forecast.

            runningCash = runningCash + dailyInflow - dailyOutflow;

            forecastData.push({
                predictedCashBalance: Math.round(runningCash),
                inflows: Math.round(dailyInflow),
                outflows: Math.round(dailyOutflow)
            });
        }

        // 3. Calculate Health Score (EXACT MATCH to Client Logic)
        let score = 75;
        const insights = [];

        // Negative Days
        const negativeDays = forecastData.filter(f => f.predictedCashBalance < 0).length;
        if (negativeDays > 0) {
            const penalty = Math.min(negativeDays * 10, 60);
            score -= penalty;
            insights.push(`⚠️ Critical: Cash balance predicted to be negative for ${negativeDays} days.`);
        }

        // Runway
        // Calculate runway based on the forecast trend, not just raw daily burn
        const totalOut = forecastData.reduce((s, f) => s + f.outflows, 0);
        const totalIn = forecastData.reduce((s, f) => s + f.inflows, 0);
        const avgBurn = (totalOut - totalIn) / days;
        const runway = avgBurn > 0 ? Math.floor(currentCash / avgBurn) : 999;

        if (runway < 15) {
            score -= 40;
            insights.push('⏰ Emergency: Less than 15 days of cash remaining.');
        } else if (runway < 30) {
            score -= 20;
            insights.push(`⚠️ Caution: Cash runway is low (${runway} days).`);
        } else if (runway >= 90) {
            if (totalIn > 0) {
                score += 10;
                insights.push('✅ Strong cash buffer (90+ days runway).');
            } else {
                insights.push('ℹ️ High cash reserves, but no revenue stream.');
            }
        }

        // Profitability
        const profitMargin = totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : -100;
        if (profitMargin < 0) {
            score -= 15;
            insights.push(`💸 Burning cash: Expenses exceed sales by ${Math.abs(Math.round(profitMargin))}%`);
        } else if (profitMargin > 15) {
            score += 15;
            insights.push('📈 Healthy profit margins detected.');
        }

        // Volatility
        const avgDailyOut = totalOut / days;
        const highOutflowDays = forecastData.filter(f => f.outflows > avgDailyOut * 3).length;
        if (highOutflowDays > 2) {
            score -= 5;
        }

        // Zero Revenue
        if (totalIn === 0) {
            score = Math.min(score, 40);
            insights.unshift('⚠️ No revenue projected. Business is in survival mode.');
        }

        // Caps
        score = Math.min(100, Math.max(0, Math.round(score)));

        // Status
        let status = 'Healthy';
        if (score < 40) status = 'Critical';
        else if (score < 70) status = 'Warning';
        else if (score >= 90) status = 'Excellent';

        res.status(200).json({
            // Legacy / Server keys
            runway: runway,
            cashBalance: currentCash,
            healthScore: score,
            dailyBurn: Math.round(averageDailyExpenses), // sending raw daily avg expense as burn estimate for generic display
            velocity: { change: 0, trend: 'stable' },

            // Client / Shared Context keys
            score: score,
            status: status,
            insights: insights,
            components: {
                runway: runway,
                negativeDays: negativeDays,
                volatility: highOutflowDays
            }
        });

    } catch (error) {
        console.error('Situation Data Error:', error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    explainRisk,
    handleGeneralQuery,
    getAlerts,
    markAlertRead,
    generateAIInsights,
    getInsights,
    askQuestion,
    generateAlerts,
    getIntelligenceGraph,
    getGSTProjection,
    getSituationData
};
