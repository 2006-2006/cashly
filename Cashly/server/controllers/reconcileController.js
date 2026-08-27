/**
 * reconcileController.js
 * Finance-Ops Reconciliation Agent — works with REAL uploaded business data.
 * Falls back to synthetic demo data only when no real data is found.
 */

const supabase = require('../config/supabase');
const { generateSyntheticData } = require('../data/syntheticData');
const { ReconcileEngine } = require('../services/ReconcileEngine');

const reportStore = new Map();

// ─── Auth-aware Supabase client ───────────────────────────────────────────────
const getDbClient = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    return token && supabase.getAuthenticatedClient
        ? supabase.getAuthenticatedClient(token)
        : supabase;
};

/**
 * GET /api/reconcile/data
 * Returns raw dataset for the business (real data or synthetic demo).
 */
const getReconcileData = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) {
            const demo = generateSyntheticData();
            demo.source = 'demo';
            return res.json({ success: true, data: demo });
        }

        const db = getDbClient(req);
        const [salesRes, expensesRes, receivablesRes] = await Promise.all([
            db.from('sales').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(200),
            db.from('expenses').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(200),
            db.from('receivables').select('*').eq('business_id', businessId).order('expected_payment_date', { ascending: true }).limit(200),
        ]);

        const sales = salesRes.data || [];
        const expenses = expensesRes.data || [];
        const receivables = receivablesRes.data || [];

        // If no real data, fall back to synthetic demo
        if (sales.length === 0 && expenses.length === 0 && receivables.length === 0) {
            const demo = generateSyntheticData();
            demo.source = 'demo';
            return res.json({ success: true, data: demo, usingDemo: true });
        }

        // Map real data into reconciliation-ready format
        const bankLedger = expenses.map((e, i) => ({
            id: `BNK-${String(i + 1).padStart(3, '0')}`,
            type: 'bank_ledger',
            date: e.date,
            amount: Number(e.amount) || 0,
            counterparty: e.vendor || e.category || 'Unknown',
            reference: e.reference_number || e.description || `EXP-${e.id?.slice(0, 8) || i}`,
            rawRef: e.reference_number || `EXP-${e.id?.slice(0, 8) || i}`,
            description: e.description || e.category,
            _realId: e.id,
        }));

        const invoiceRegister = receivables.map((r, i) => ({
            id: `INV-${String(i + 1).padStart(3, '0')}`,
            type: 'invoice',
            date: r.invoice_date || r.expected_payment_date,
            amount: Number(r.amount_due) || 0,
            vendor: r.customer_name || r.party_name || 'Unknown',
            refCode: r.invoice_number || r.reference || `REC-${r.id?.slice(0, 8) || i}`,
            status: r.status || 'unpaid',
            dueDate: r.expected_payment_date,
            _realId: r.id,
        }));

        const paymentReceipts = sales.map((s, i) => ({
            id: `PAY-${String(i + 1).padStart(3, '0')}`,
            type: 'payment_receipt',
            date: s.date,
            amount: Number(s.amount) || 0,
            payer: s.customer || s.party || s.description || 'Customer',
            memo: s.reference_number || s.description || `SAL-${s.id?.slice(0, 8) || i}`,
            channel: s.payment_method || 'Bank',
            _realId: s.id,
        }));

        res.json({
            success: true,
            data: {
                bankLedger,
                invoiceRegister,
                paymentReceipts,
                source: 'real',
                meta: {
                    totalRecords: bankLedger.length + invoiceRegister.length + paymentReceipts.length,
                    sources: 3,
                    generatedAt: new Date().toISOString(),
                    businessId,
                }
            }
        });
    } catch (err) {
        console.error('[reconcile] getReconcileData error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * POST /api/reconcile/run
 * Runs the reconciliation loop.
 * Body: { businessId?, amtTolerancePct?, dateWindowDays?, fuzzyMaxDist? }
 */
const runReconciliation = async (req, res) => {
    try {
        const {
            businessId,
            amtTolerancePct = 0.02,
            dateWindowDays = 3,
            fuzzyMaxDist = 2,
        } = req.body || {};

        let dataset;
        let dataSource = 'demo';

        if (businessId) {
            const db = getDbClient(req);
            const [salesRes, expensesRes, receivablesRes] = await Promise.all([
                db.from('sales').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(200),
                db.from('expenses').select('*').eq('business_id', businessId).order('date', { ascending: false }).limit(200),
                db.from('receivables').select('*').eq('business_id', businessId).limit(200),
            ]);

            const sales = salesRes.data || [];
            const expenses = expensesRes.data || [];
            const receivables = receivablesRes.data || [];
            const hasRealData = sales.length > 0 || expenses.length > 0 || receivables.length > 0;

            if (hasRealData) {
                dataSource = 'real';
                const bankLedger = expenses.map((e, i) => ({
                    id: `BNK-${String(i + 1).padStart(3, '0')}`,
                    type: 'bank_ledger',
                    date: e.date || new Date().toISOString().split('T')[0],
                    amount: Number(e.amount) || 0,
                    counterparty: e.vendor || e.category || 'Unknown',
                    reference: e.reference_number || e.description || `EXP-${e.id?.slice(0, 8) || i}`,
                    rawRef: e.reference_number || `EXP-${e.id?.slice(0, 8) || i}`,
                    description: e.description || e.category,
                }));

                const invoiceRegister = receivables.map((r, i) => ({
                    id: `INV-${String(i + 1).padStart(3, '0')}`,
                    type: 'invoice',
                    date: r.invoice_date || r.expected_payment_date || new Date().toISOString().split('T')[0],
                    amount: Number(r.amount_due) || 0,
                    vendor: r.customer_name || r.party_name || 'Unknown',
                    refCode: r.invoice_number || r.reference || `REC-${r.id?.slice(0, 8) || i}`,
                    status: r.status || 'unpaid',
                    dueDate: r.expected_payment_date,
                }));

                const paymentReceipts = sales.map((s, i) => ({
                    id: `PAY-${String(i + 1).padStart(3, '0')}`,
                    type: 'payment_receipt',
                    date: s.date || new Date().toISOString().split('T')[0],
                    amount: Number(s.amount) || 0,
                    payer: s.customer || s.party || s.description || 'Customer',
                    memo: s.reference_number || s.description || `SAL-${s.id?.slice(0, 8) || i}`,
                    channel: s.payment_method || 'Bank',
                }));

                dataset = {
                    bankLedger,
                    invoiceRegister,
                    paymentReceipts,
                    meta: {
                        totalRecords: bankLedger.length + invoiceRegister.length + paymentReceipts.length,
                        sources: 3,
                        generatedAt: new Date().toISOString(),
                        businessId,
                    }
                };
            } else {
                dataset = generateSyntheticData();
                dataSource = 'demo';
            }
        } else {
            dataset = generateSyntheticData();
        }

        const engine = new ReconcileEngine({ amtTolerancePct, dateWindowDays, fuzzyMaxDist });
        const report = engine.run(dataset);
        report.dataset = dataset;
        report.config = { amtTolerancePct, dateWindowDays, fuzzyMaxDist };
        report.dataSource = dataSource;

        reportStore.set(report.runId, report);
        if (reportStore.size > 20) {
            reportStore.delete(reportStore.keys().next().value);
        }

        res.json({ success: true, report });
    } catch (err) {
        console.error('[reconcile] runReconciliation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/reconcile/report/:id
 */
const getReport = async (req, res) => {
    try {
        const report = reportStore.get(req.params.id);
        if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getReconcileData, runReconciliation, getReport };
