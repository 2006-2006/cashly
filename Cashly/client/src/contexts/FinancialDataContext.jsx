import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AuthContext from './AuthContext';

// ─── Single Source of Truth for ALL financial metrics ───────────────────────
// Every page (Dashboard, AI Analysis, Charts) MUST consume this context
// instead of running independent Supabase queries or duplicate math.

const FinancialDataContext = createContext(null);

// ── Date range helpers ──────────────────────────────────────────────────────
const getDateBoundaries = (filter, sales, expenses) => {
    const now = new Date();
    let startDate;
    const endDate = now;

    if (filter === '30days' || filter === '30d') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
    } else if (filter === '90d') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 90);
    } else if (filter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        // 'all' — use earliest date in dataset
        const allDates = [
            ...sales.map(s => new Date(s.date)),
            ...expenses.map(e => new Date(e.date))
        ].filter(d => !isNaN(d));
        startDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date(0);
    }

    return { startDate, endDate };
};

export const FinancialDataProvider = ({ children }) => {
    const { user, selectedBusiness } = useContext(AuthContext);

    // ── Raw data from Supabase ──────────────────────────────────────────
    const [rawSales, setRawSales] = useState([]);
    const [rawExpenses, setRawExpenses] = useState([]);
    const [rawReceivables, setRawReceivables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastFetchTime, setLastFetchTime] = useState(0);

    // ── Shared filter state ─────────────────────────────────────────────
    const [dateRange, setDateRange] = useState('30days');

    // Prevent duplicate fetches
    const fetchLock = useRef(false);

    // ── Core data fetch (single Supabase round-trip) ────────────────────
    const fetchFinancialData = useCallback(async () => {
        if (!selectedBusiness?.id || fetchLock.current) return;
        fetchLock.current = true;
        setIsLoading(true);

        try {
            const [salesRes, expRes, recRes] = await Promise.all([
                supabase.from('sales').select('*').eq('business_id', selectedBusiness.id).order('date', { ascending: false }),
                supabase.from('expenses').select('*').eq('business_id', selectedBusiness.id).order('date', { ascending: false }),
                supabase.from('receivables').select('*').eq('business_id', selectedBusiness.id)
            ]);

            setRawSales(salesRes.data || []);
            setRawExpenses(expRes.data || []);
            setRawReceivables(recRes.data || []);
            setLastFetchTime(Date.now());
        } catch (error) {
            console.error('FinancialDataContext: fetch error', error);
        } finally {
            setIsLoading(false);
            fetchLock.current = false;
        }
    }, [selectedBusiness?.id]);

    // ── Trigger fetch on business change ─────────────────────────────────
    useEffect(() => {
        fetchFinancialData();
    }, [fetchFinancialData]);

    // ── Cache invalidation trigger for Upload page ──────────────────────
    const refreshFinancialData = useCallback(() => {
        fetchLock.current = false; // reset lock so fetch can proceed
        return fetchFinancialData();
    }, [fetchFinancialData]);

    // ── Computed metrics (recalculated when raw data or dateRange change) ─
    const computedMetrics = useMemo(() => {
        const sales = rawSales;
        const expenses = rawExpenses;
        const receivables = rawReceivables;

        const hasRealData = sales.length > 0 || expenses.length > 0;

        // ── All-time Cash Balance ───────────────────────────────────────
        const allTimeRevenue = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const allTimeExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const cashBalance = allTimeRevenue - allTimeExpenses;

        // ── Filtered period metrics ─────────────────────────────────────
        const { startDate, endDate } = getDateBoundaries(dateRange, sales, expenses);

        const filteredSales = sales.filter(s => {
            const d = new Date(s.date);
            return d >= startDate && d <= endDate;
        });
        const filteredExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d >= startDate && d <= endDate;
        });

        const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

        // ── Daily Burn (last 30 days of expenses / 30) ──────────────────
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const last30DaysExpenses = expenses
            .filter(e => new Date(e.date) >= thirtyDaysAgo)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const dailyBurn = last30DaysExpenses / 30;

        // ── Runway Days ─────────────────────────────────────────────────
        const runwayDays = dailyBurn > 0 ? Math.min(999, Math.floor(cashBalance / dailyBurn)) : 999;

        // ── Period span in days (for telemetry) ─────────────────────────
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysInPeriod = Math.max(1, Math.ceil((endDate - startDate) / msPerDay));

        // ── Trend vs previous period ────────────────────────────────────
        let prevStartDate = new Date(startDate);
        if (dateRange === '30days' || dateRange === '30d') {
            prevStartDate.setDate(prevStartDate.getDate() - 30);
        } else if (dateRange === 'month') {
            const now = new Date();
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        } else {
            prevStartDate = new Date(0);
        }

        const prevSales = sales.filter(s => { const d = new Date(s.date); return d >= prevStartDate && d < startDate; });
        const prevExp = expenses.filter(e => { const d = new Date(e.date); return d >= prevStartDate && d < startDate; });
        const prevRev = prevSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const prevExpTotal = prevExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const salesTrend = prevRev > 0 ? Math.round(((totalRevenue - prevRev) / prevRev) * 100) : 0;
        const expensesTrend = prevExpTotal > 0 ? Math.round(((totalExpenses - prevExpTotal) / prevExpTotal) * 100) : 0;

        // ── Record counts ───────────────────────────────────────────────
        const salesCount = sales.length;
        const expensesCount = expenses.length;
        const totalRecords = salesCount + expensesCount;

        // ── Receivables ─────────────────────────────────────────────────
        const totalReceivables = receivables
            .filter(r => r.status !== 'Paid')
            .reduce((sum, r) => sum + (Number(r.amount_due || r.amount) || 0), 0);

        return {
            hasRealData,
            // All-time
            cashBalance,
            allTimeRevenue,
            allTimeExpenses,
            // Filtered period
            totalRevenue,
            totalExpenses,
            netProfit,
            profitMargin,
            // Burn & Runway
            dailyBurn,
            runwayDays,
            // Trends
            salesTrend,
            expensesTrend,
            // Counts
            salesCount,
            expensesCount,
            totalRecords,
            totalReceivables,
            // Period metadata
            daysInPeriod,
            startDate,
            endDate,
            // Filtered arrays (for charts)
            filteredSales,
            filteredExpenses,
        };
    }, [rawSales, rawExpenses, rawReceivables, dateRange]);

    // ── AI Grounding Payload ────────────────────────────────────────────
    // Pre-formatted string injected into every AI request to prevent
    // the LLM from inventing or recalculating financial figures.
    const aiGroundingPayload = useMemo(() => {
        const m = computedMetrics;
        const rangeName = dateRange === '30days' || dateRange === '30d' ? 'Past 30 Days'
            : dateRange === '90d' ? 'Past 90 Days'
            : dateRange === 'month' ? 'This Month'
            : 'All Time';

        return `System Context: [Active Period: ${rangeName} | Cash Balance: ₹${Math.round(m.cashBalance).toLocaleString('en-IN')} | Revenue: ₹${Math.round(m.totalRevenue).toLocaleString('en-IN')} | Expenses: ₹${Math.round(m.totalExpenses).toLocaleString('en-IN')} | Net Profit: ₹${Math.round(m.netProfit).toLocaleString('en-IN')} | Margin: ${m.profitMargin}% | Daily Burn: ₹${Math.round(m.dailyBurn).toLocaleString('en-IN')} | Runway: ${m.runwayDays} days | Records: ${m.totalRecords}]`;
    }, [computedMetrics, dateRange]);

    const value = useMemo(() => ({
        // Raw arrays (for charts, forecast, notifications — still computed locally)
        rawSales,
        rawExpenses,
        rawReceivables,
        // Canonical computed metrics
        metrics: computedMetrics,
        // Shared filter
        dateRange,
        setDateRange,
        // Loading
        isLoading,
        lastFetchTime,
        // Cache invalidation
        refreshFinancialData,
        // AI grounding
        aiGroundingPayload,
    }), [rawSales, rawExpenses, rawReceivables, computedMetrics, dateRange, isLoading, lastFetchTime, refreshFinancialData, aiGroundingPayload]);

    return (
        <FinancialDataContext.Provider value={value}>
            {children}
        </FinancialDataContext.Provider>
    );
};

export const useFinancialData = () => {
    const ctx = useContext(FinancialDataContext);
    if (!ctx) throw new Error('useFinancialData must be used inside FinancialDataProvider');
    return ctx;
};

export default FinancialDataContext;

