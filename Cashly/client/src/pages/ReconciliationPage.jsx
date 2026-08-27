import { useState, useRef, useContext, useCallback } from 'react';
import {
    GitMerge, Play, RefreshCw, AlertTriangle, CheckCircle2,
    XCircle, ChevronDown, ChevronUp, Database, Layers,
    Clock, Info, BarChart3, FileText, CreditCard, ShieldCheck,
    Sparkles, Activity, TrendingUp, ArrowRight, Filter, SortAsc,
    Check
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import AuthContext from '../contexts/AuthContext';

// ─── Formatters ───────────────────────────────────────────────────────────────
import { formatCurrency as fmtINR, formatDate as fmtDate } from '../lib/formatters';

// ─── Confidence Badge ─────────────────────────────────────────────────────────
const ConfidenceBadge = ({ level }) => {
    const styles = {
        HIGH: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        MEDIUM: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        LOW: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    };
    const s = styles[level] || styles.LOW;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${s}`}>
            {level}
        </span>
    );
};

// ─── Reason Code Badge ────────────────────────────────────────────────────────
const REASON_META = {
    REF_MISMATCH:           { cls: 'text-rose-500 bg-rose-500/10 border-rose-500/20',     label: 'Ref Mismatch' },
    AMT_TOLERANCE_EXCEEDED: { cls: 'text-orange-500 bg-orange-500/10 border-orange-500/20', label: 'Amount Exceeded' },
    DATE_OUT_OF_WINDOW:     { cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20',  label: 'Date Window' },
    NO_COUNTERPART:         { cls: 'text-rose-500 bg-rose-500/10 border-rose-500/20',     label: 'No Counterpart' },
    DUPLICATE_CANDIDATE:    { cls: 'text-violet-500 bg-violet-500/10 border-violet-500/20', label: 'Duplicate' },
    MISSING_MEMO:           { cls: 'text-blue-500 bg-blue-500/10 border-blue-500/20',     label: 'Missing Memo' },
    UNPAID_INVOICE:         { cls: 'text-rose-500 bg-rose-500/10 border-rose-500/20',     label: 'Unpaid Invoice' },
    UNLINKED_RECEIPT:       { cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20',  label: 'Unlinked Receipt' },
    AMT_MISMATCH:           { cls: 'text-orange-500 bg-orange-500/10 border-orange-500/20', label: 'Amt Mismatch' },
};
const ReasonBadge = ({ code }) => {
    const m = REASON_META[code] || { cls: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20', label: code };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${m.cls}`}>
            {m.label}
        </span>
    );
};

// ─── Sleek Circular Gauge ─────────────────────────────────────────────────────
const MatchRateGauge = ({ rate, animate, matched, total }) => {
    const R = 70, cx = 100, cy = 100;
    const circ = 2 * Math.PI * R;
    const filled = (rate / 100) * circ;

    const color = rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#f43f5e';
    const label = rate >= 80 ? 'Excellent' : rate >= 60 ? 'Moderate' : 'Needs Review';

    return (
        <div className="relative flex flex-col items-center">
            <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                {/* Track */}
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                {/* Filled circle */}
                <Motion.circle
                    cx={cx} cy={cy} r={R}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${circ}`}
                    initial={{ strokeDasharray: `0 ${circ}` }}
                    animate={{ strokeDasharray: animate ? `${filled} ${circ}` : `0 ${circ}` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Motion.span
                    className="text-4xl font-semibold text-white tracking-tight"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: animate ? 1 : 0, y: animate ? 0 : 10 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                >
                    {rate}%
                </Motion.span>
                <Motion.span
                    className="text-[11px] font-medium mt-1"
                    style={{ color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: animate ? 1 : 0 }}
                    transition={{ delay: 1.0 }}
                >
                    {label}
                </Motion.span>
                <Motion.div
                    className="flex items-center gap-1 mt-1 text-[11px] text-neutral-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: animate ? 1 : 0 }}
                    transition={{ delay: 1.1 }}
                >
                    <span className="text-neutral-300">{matched}</span>
                    <span>/</span>
                    <span>{total} matched</span>
                </Motion.div>
            </div>
        </div>
    );
};

// ─── Pass Bar ─────────────────────────────────────────────────────────────────
const PassBar = ({ pass, index, animate }) => {
    const pct = pass.processed > 0 ? (pass.matched / pass.processed) * 100 : 0;
    
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-300">Pass {pass.pass}</span>
                    <span className="text-[11px] text-neutral-500">{pass.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-neutral-400 font-mono">{pass.matched}<span className="text-neutral-600">/{pass.processed}</span></span>
                    <span className="text-neutral-500">{pass.durationMs}ms</span>
                </div>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <Motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: '0%' }}
                    animate={{ width: animate ? `${pct}%` : '0%' }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.15 + 0.3 }}
                />
            </div>
            <div className="flex gap-3 text-[11px] font-mono text-neutral-500">
                <span className="text-emerald-500/80">{pass.matched} matched</span>
                <span>·</span>
                <span className="text-rose-500/80">{pass.exceptions} exceptions</span>
            </div>
        </div>
    );
};

// ─── Agent Step ───────────────────────────────────────────────────────────────
const AgentStep = ({ step, done, active, index }) => (
    <Motion.div
        className="flex items-center gap-3 relative"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
    >
        {/* Connecting line */}
        {index > 0 && (
            <div className={`absolute -top-6 left-[11px] w-[1px] h-6 transition-colors duration-500 ${done || active ? 'bg-neutral-600' : 'bg-neutral-800'}`} />
        )}
        
        <div className={`relative w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${done ? 'bg-white text-black' : active ? 'bg-neutral-800 border border-neutral-600' : 'bg-neutral-900 border border-neutral-800'}`}>
            {done ? (
                <Check className="w-3.5 h-3.5" />
            ) : active ? (
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            )}
        </div>
        <span className={`text-sm font-medium transition-colors duration-500 ${done ? 'text-white' : active ? 'text-neutral-200' : 'text-neutral-500'}`}>
            {step}
        </span>
        {done && (
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="ml-auto">
                <span className="text-xs text-neutral-500">Done</span>
            </Motion.div>
        )}
    </Motion.div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, delay = 0 }) => (
    <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.3 }}
        className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex flex-col"
    >
        <span className="text-xs font-medium text-neutral-400 mb-2">{label}</span>
        <p className="text-3xl font-semibold text-white tracking-tight">{value}</p>
        {sub && <p className="text-xs text-neutral-500 mt-2 font-medium">{sub}</p>}
    </Motion.div>
);

// ─── Matched Record Card ──────────────────────────────────────────────────────
const MatchedCard = ({ match, index }) => {
    const [open, setOpen] = useState(false);

    return (
        <Motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.4) }}
            className="border border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden"
        >
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-4 px-4 py-3.5 text-left">
                <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4">
                    {/* Customer + invoice reference — visible without expanding */}
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {match.bank?.payer || match.bank?.reference || '—'}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            Invoice: {match.invoice?.refCode || match.invoice?.id || '—'}
                            {match.invoice?.vendor ? ` · ${match.invoice.vendor}` : ''}
                        </p>
                    </div>
                    <ConfidenceBadge level={match.confidence} />
                    <span className="text-[11px] text-neutral-500 font-mono hidden sm:block">Pass {match.pass}</span>
                    <span className="text-sm font-medium text-white font-mono hidden md:block">{fmtINR(match.bank?.amount)}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <Motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { title: 'Payment Received', icon: CreditCard, data: [
                                    ['ID',        match.bank?.id],
                                    ['Date',      fmtDate(match.bank?.date)],
                                    ['Amount',    fmtINR(match.bank?.amount)],
                                    ['Customer',  match.bank?.payer],
                                    ['Reference', match.bank?.memo],
                                ]},
                                { title: 'Invoice', icon: FileText, data: [
                                    ['ID', match.invoice?.id], ['Date', fmtDate(match.invoice?.date)],
                                    ['Amount', fmtINR(match.invoice?.amount)], ['Ref Code', match.invoice?.refCode],
                                    ['Vendor', match.invoice?.vendor],
                                ]},
                                { title: 'Payment Receipt', icon: CreditCard, data: match.payment ? [
                                    ['ID', match.payment?.id], ['Date', fmtDate(match.payment?.date)],
                                    ['Amount', fmtINR(match.payment?.amount)], ['Channel', match.payment?.channel],
                                    ['Payer', match.payment?.payer],
                                ] : null },
                            ].map(({ title, icon: Icon, data }) => (
                                <div key={title} className="bg-black/20 rounded-lg p-3 border border-white/5">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 mb-3">
                                        <Icon className="w-3.5 h-3.5" />{title}
                                    </div>
                                    {data ? data.map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-baseline gap-2 mb-1.5">
                                            <span className="text-[11px] text-neutral-500 shrink-0">{k}</span>
                                            <span className="text-[11px] text-neutral-300 text-right truncate max-w-[140px]">{v || '—'}</span>
                                        </div>
                                    )) : <p className="text-[11px] text-neutral-600 italic">No receipt linked</p>}
                                </div>
                            ))}
                        </div>
                        <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 bg-neutral-900/50 rounded-lg border border-white/5">
                            <Info className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                            <span className="text-[11px] text-neutral-400">{match.reason}</span>
                            <span className="ml-auto text-[11px] text-neutral-500 shrink-0">Δ{fmtINR(match.amtDelta)} · Δ{match.dayDelta}d</span>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </Motion.div>
    );
};

// ─── Exception Card ───────────────────────────────────────────────────────────
const ExceptionCard = ({ exc, index }) => (
    <Motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.6) }}
        className="flex items-start gap-4 px-4 py-4 border border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
        <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center flex-shrink-0">
            {exc.sourceType === 'bank_ledger' && <Database className="w-4 h-4 text-neutral-400" />}
            {exc.sourceType === 'invoice' && <FileText className="w-4 h-4 text-neutral-400" />}
            {exc.sourceType === 'payment_receipt' && <CreditCard className="w-4 h-4 text-neutral-400" />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
                <span className="text-xs font-medium text-white">{exc.exceptionId}</span>
                <ReasonBadge code={exc.reasonCode} />
            </div>
            <p className="text-xs text-neutral-400">{exc.description}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                <span className="capitalize">{exc.sourceType.replace('_', ' ')}</span>
                <span>·</span>
                <span>{fmtDate(exc.date)}</span>
            </div>
        </div>
        <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-white">{fmtINR(exc.amount)}</p>
            <p className="text-[11px] text-neutral-500 mt-1">{exc.reference?.slice(0, 16)}</p>
        </div>
    </Motion.div>
);

// ─── SOURCE PILL ──────────────────────────────────────────────────────────────
const SourcePill = ({ source }) => source === 'real'
    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[11px] font-medium text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" />Live Business Data</span>
    : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md text-[11px] font-medium text-amber-400"><Sparkles className="w-3.5 h-3.5" />Demo Data</span>;

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const ReconciliationPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [report, setReport] = useState(null);
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState([0, 0, 0, 0, 0]);
    const [tab, setTab] = useState('matched');
    const [sortExc, setSortExc] = useState('reasonCode');
    const [filterConf, setFilterConf] = useState('ALL');
    const [gaugeAnimate, setGaugeAnimate] = useState(false);

    const STEPS = [
        'Connecting to business data sources',
        'Pass 1 — Exact Reference Match',
        'Pass 2 — Amount + Date Window',
        'Pass 3 — Fuzzy Tolerance Match',
        'Building exception list & scoring',
    ];

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const runAgent = useCallback(async () => {
        setRunning(true);
        setReport(null);
        setGaugeAnimate(false);
        setSteps([0, 0, 0, 0, 0]);

        setSteps([1, 0, 0, 0, 0]); await delay(700);
        setSteps([1, 1, 0, 0, 0]); await delay(550);
        setSteps([1, 1, 1, 0, 0]); await delay(480);
        setSteps([1, 1, 1, 1, 0]); await delay(420);

        try {
            const businessId = selectedBusiness?._id || selectedBusiness?.id;
            const { data } = await api.post('/reconcile/run', {
                businessId,
                amtTolerancePct: 0.02,
                dateWindowDays: 3,
                fuzzyMaxDist: 2,
            });
            setSteps([1, 1, 1, 1, 1]);
            await delay(350);
            setReport(data.report);
            setGaugeAnimate(true);
        } catch (err) {
            console.error('[Reconcile]', err);
            setSteps([0, 0, 0, 0, 0]);
        } finally {
            setRunning(false);
        }
    }, [selectedBusiness]);

    const sortedExceptions = report
        ? [...report.exceptions].sort((a, b) =>
            sortExc === 'amount' ? b.amount - a.amount
            : sortExc === 'date' ? a.date?.localeCompare(b.date || '')
            : a.reasonCode.localeCompare(b.reasonCode))
        : [];

    const filteredMatches = report
        ? (filterConf === 'ALL' ? report.matched : report.matched.filter(m => m.confidence === filterConf))
        : [];

    const reasonDist = report
        ? report.exceptions.reduce((a, e) => { a[e.reasonCode] = (a[e.reasonCode] || 0) + 1; return a; }, {})
        : {};

    return (
        <div className="flex h-screen w-full bg-[#09090b] text-neutral-200 overflow-hidden font-sans">
            <Sidebar />

            <main className="flex-1 overflow-y-auto no-scrollbar relative">
                {/* ── Header ─────────────────────────────────────────── */}
                <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-white/10 px-8 py-5 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-semibold text-white">Reconciliation</h1>
                            {report && <SourcePill source={report.dataSource} />}
                        </div>
                        <p className="text-sm text-neutral-500">
                            Automated multi-source transaction matching
                        </p>
                    </div>

                    <button
                        onClick={runAgent}
                        disabled={running}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            running
                                ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed border border-white/5'
                                : 'bg-white text-black hover:bg-neutral-200 active:scale-[0.98]'
                        }`}
                    >
                        {running
                            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                            : <><Play className="w-4 h-4 fill-current" /> Run Reconciliation</>}
                    </button>
                </header>

                <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
                    {/* ── Agent Console / Pipeline ────────────────────────────────────── */}
                    {running && !report && (
                        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 max-w-2xl mx-auto mt-12 shadow-2xl">
                            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                                <Activity className="w-5 h-5 text-neutral-400" />
                                <h3 className="text-base font-medium text-white">Processing Pipeline</h3>
                            </div>
                            <div className="space-y-6 pl-2">
                                {STEPS.map((s, i) => (
                                    <AgentStep key={i} step={s} done={steps[i] === 1} active={running && steps[i] === 0 && (i === 0 || steps[i - 1] === 1)} index={i} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Report ──────────────────────────────────────────── */}
                    <AnimatePresence>
                        {report && !running && (
                            <Motion.div
                                key="report"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-8"
                            >
                                {/* KPI Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <KPICard label="Total Records" value={report.summary.totalRecords} sub="Input batch" delay={0} />
                                    <KPICard label="Matched" value={report.summary.totalMatched} sub="Resolved entries" delay={0.1} />
                                    <KPICard label="Exceptions" value={report.summary.totalExceptions} sub="Requires review" delay={0.2} />
                                    <KPICard label="Processing Time" value={`${report.durationMs}ms`} sub={`Run ${report.runId.slice(0, 8)}`} delay={0.3} />
                                </div>

                                {/* Main Analytics */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Gauge */}
                                    <div className="col-span-1 rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col items-center justify-center">
                                        <h3 className="text-sm font-medium text-neutral-300 self-start mb-6 w-full border-b border-white/5 pb-3">Match Rate</h3>
                                        <MatchRateGauge
                                            rate={report.summary.matchRate}
                                            animate={gaugeAnimate}
                                            matched={report.summary.totalMatched}
                                            total={report.summary.bankEntries}
                                        />
                                    </div>

                                    {/* Pass breakdown */}
                                    <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                                        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
                                            <h3 className="text-sm font-medium text-neutral-300">Matching Engine Passes</h3>
                                        </div>
                                        <div className="space-y-6">
                                            {report.passes.map((p, i) => (
                                                <PassBar key={p.pass} pass={p} index={i} animate={gaugeAnimate} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Data Area */}
                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                                    {/* Tabs */}
                                    <div className="flex items-center gap-6 px-6 pt-4 border-b border-white/10">
                                        {[
                                            { key: 'matched', label: 'Matched Records', count: report.summary.totalMatched },
                                            { key: 'exceptions', label: 'Exceptions', count: report.summary.totalExceptions },
                                        ].map(t => (
                                            <button
                                                key={t.key}
                                                onClick={() => setTab(t.key)}
                                                className={`flex items-center gap-2 pb-4 text-sm font-medium transition-colors border-b-2 ${tab === t.key ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
                                            >
                                                {t.label}
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${tab === t.key ? 'bg-white/10 text-white' : 'bg-white/5 text-neutral-400'}`}>{t.count}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Controls & List */}
                                    <div className="p-6">
                                        {/* Filters */}
                                        <div className="flex items-center justify-between mb-6">
                                            {tab === 'matched' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-neutral-500 mr-2">Filter:</span>
                                                    {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                                                        <button key={f} onClick={() => setFilterConf(f)}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterConf === f ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}>
                                                            {f === 'ALL' ? 'All' : f}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {tab === 'exceptions' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-neutral-500 mr-2">Sort by:</span>
                                                    {[{ k: 'reasonCode', l: 'Reason' }, { k: 'amount', l: 'Amount' }, { k: 'date', l: 'Date' }].map(s => (
                                                        <button key={s.k} onClick={() => setSortExc(s.k)}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortExc === s.k ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}>
                                                            {s.l}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Lists */}
                                        <AnimatePresence mode="wait">
                                            {tab === 'matched' && (
                                                <Motion.div key="matched" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                                    {filteredMatches.length === 0
                                                        ? <div className="text-center py-12 text-neutral-500 text-sm">No records match this filter.</div>
                                                        : filteredMatches.map((m, i) => <MatchedCard key={m.matchId} match={m} index={i} />)}
                                                </Motion.div>
                                            )}
                                            {tab === 'exceptions' && (
                                                <Motion.div key="exceptions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                                    {sortedExceptions.map((e, i) => <ExceptionCard key={e.exceptionId} exc={e} index={i} />)}
                                                </Motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </Motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Empty State ──────────────────────────────────────── */}
                    {!report && !running && (
                        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <GitMerge className="w-8 h-8 text-neutral-300" />
                            </div>
                            
                            <h2 className="text-2xl font-semibold text-white tracking-tight mb-3">Reconcile Financial Data</h2>
                            <p className="text-neutral-400 text-sm max-w-lg mb-10 leading-relaxed">
                                Upload your data sources and our 3-pass matching engine will securely map your bank ledgers, invoices, and payment receipts.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mb-10">
                                {[
                                    { icon: Database, label: 'Expenses', sub: 'Bank Ledger' },
                                    { icon: FileText, label: 'Receivables', sub: 'Invoices' },
                                    { icon: CreditCard, label: 'Sales', sub: 'Receipts' },
                                ].map((s, i) => (
                                    <div key={i} className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                                        <s.icon className="w-6 h-6 text-neutral-400 mb-3" />
                                        <span className="text-sm font-medium text-white mb-1">{s.label}</span>
                                        <span className="text-xs text-neutral-500">{s.sub}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={runAgent}
                                className="px-8 py-3 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition-colors active:scale-[0.98]"
                            >
                                Run Reconciliation
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReconciliationPage;
