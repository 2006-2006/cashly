import {
    Sparkles, Send, Bot, Terminal, Activity, Clock, Search, BarChart3,
    AlertTriangle, DollarSign, PiggyBank, TrendingUp, TrendingDown,
    CheckCircle2, Cpu, Zap, RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import AuthContext from '../contexts/AuthContext';
import { useFinancialData } from '../contexts/FinancialDataContext';
import Sidebar from '../components/Sidebar';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import StructuredResponse from '../components/AI/StructuredResponse';
import { formatCurrency } from '../lib/formatters';

const AIAnalysisPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const {
        metrics: financialMetrics,
        aiGroundingPayload,
    } = useFinancialData();
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [activeSteps, setActiveSteps] = useState([]);
    const [toolsUsed, setToolsUsed] = useState([]);
    const [situation, setSituation] = useState(null);
    const [telemetryHistory, setTelemetryHistory] = useState(Array(20).fill(30));
    const [userQuery, setUserQuery] = useState('');
    const chatContainerRef = useRef(null);

    const fetchSituation = useCallback(async () => {
        if (!selectedBusiness) return;
        const businessId = selectedBusiness?._id || selectedBusiness?.id;
        const t0 = Date.now();

        try {
            // ── Use real backend computation for health / runway / burn ──
            const { data: sit } = await api.get(`/ai/intelligence/situation/${businessId}`);

            const latencyMs = Date.now() - t0;

            // ── Real velocity: compare this week vs last week expenses ──
            const [thisExpRes, lastExpRes] = await Promise.all([
                supabase.from('expenses').select('amount')
                    .eq('business_id', businessId)
                    .gte('date', new Date(Date.now() - 7  * 86400000).toISOString()),
                supabase.from('expenses').select('amount')
                    .eq('business_id', businessId)
                    .gte('date', new Date(Date.now() - 14 * 86400000).toISOString())
                    .lt('date',  new Date(Date.now() - 7  * 86400000).toISOString())
            ]);

            const thisWeek = (thisExpRes.data || []).reduce((s, e) => s + Number(e.amount || 0), 0);
            const lastWeek = (lastExpRes.data || []).reduce((s, e) => s + Number(e.amount || 0), 0);
            const velocityChange = lastWeek > 0
                ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
                : (thisWeek > 0 ? 100 : 0);

            // ── Real inflow opportunity: soonest pending receivable ──
            const { data: recData } = await supabase
                .from('receivables')
                .select('customer_name, amount_due, expected_payment_date, invoice_date')
                .eq('business_id', businessId)
                .neq('status', 'Paid')
                .order('expected_payment_date', { ascending: true })
                .limit(1);

            const nextRec = recData?.[0];
            const inflowOpportunity = nextRec ? {
                customerName: nextRec.customer_name || 'Unknown',
                daysOverdue: Math.floor(
                    (Date.now() - new Date(nextRec.expected_payment_date || nextRec.invoice_date)) / 86400000
                ),
                amountDue: Number(nextRec.amount_due || 0)
            } : null;

            setSituation({
                healthScore:        sit.healthScore ?? sit.score ?? 0,
                score:              sit.score       ?? sit.healthScore ?? 0,
                status:             sit.status || 'Unknown',
                insights:           sit.insights || [],
                components:         sit.components || {},
                cashBalance:        sit.cashBalance ?? financialMetrics.cashBalance,
                runway:             sit.runway ?? financialMetrics.runwayDays,
                dailyBurn:          sit.dailyBurn ?? financialMetrics.dailyBurn,
                inflowOpportunity,
                velocity:           { change: velocityChange, trend: velocityChange > 0 ? 'up' : 'down' },
                telemetry:          { latency: latencyMs, load: Math.min(100, Math.round((latencyMs / 30))) }
            });

            setTelemetryHistory(prev => [
                ...prev.slice(1),
                Math.min(100, Math.round((latencyMs / 30)))
            ]);

        } catch (e) {
            console.error('Situation error:', e);
            setSituation({
                healthScore: 0, score: 0, status: 'Unknown',
                insights: [], components: {},
                cashBalance: 0, runway: 0, dailyBurn: 0,
                inflowOpportunity: null,
                velocity: { change: 0, trend: 'stable' },
                telemetry: { latency: 0, load: 0 }
            });
        }
    }, [selectedBusiness, financialMetrics.cashBalance, financialMetrics.runwayDays, financialMetrics.dailyBurn]);

    useEffect(() => {
        let isMounted = true;
        if (selectedBusiness) {
            Promise.resolve().then(() => {
                if (isMounted) {
                    fetchSituation();
                }
            });
        }
        return () => { isMounted = false; };
    }, [selectedBusiness, fetchSituation]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, loading]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (loading) {
                setTelemetryHistory(prev => [...prev.slice(1), 60 + Math.random() * 20]);
            } else {
                setTelemetryHistory(prev => [...prev.slice(1), 25 + Math.random() * 15]);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    const prebuiltPrompts = [
        { title: "Cash Flow", prompt: "How's my cash flow?", icon: <DollarSign className="w-4 h-4" />, color: "from-green-500/20 to-emerald-600/20 text-emerald-400 border-emerald-500/30" },
        { title: "Cut Costs", prompt: "Where can I reduce expenses?", icon: <TrendingDown className="w-4 h-4" />, color: "from-red-500/20 to-rose-600/20 text-rose-400 border-red-500/30" },
        { title: "Revenue Growth", prompt: "How to increase my revenue?", icon: <TrendingUp className="w-4 h-4" />, color: "from-blue-500/20 to-indigo-600/20 text-indigo-400 border-indigo-500/30" },
        { title: "Risk Analysis", prompt: "What are my business risks?", icon: <AlertTriangle className="w-4 h-4" />, color: "from-orange-500/20 to-amber-600/20 text-amber-400 border-amber-500/30" },
        { title: "Receivables", prompt: "Analyze my pending receivables", icon: <PiggyBank className="w-4 h-4" />, color: "from-purple-500/20 to-violet-600/20 text-violet-400 border-violet-500/30" },
        { title: "Overview", prompt: "Give me a complete business overview", icon: <BarChart3 className="w-4 h-4" />, color: "from-cyan-500/20 to-teal-600/20 text-teal-400 border-teal-500/30" }
    ];

    const handleQuerySubmit = useCallback(async (query = userQuery) => {
        if (!query.trim()) return;
        setLoading(true);
        setToolsUsed([]);
        setActiveSteps([{ id: 0, message: 'Consulting Neural Ledger...', status: 'running' }]);

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: query
        };
        setChatHistory(prev => [...prev, userMsg]);
        setUserQuery('');

        try {
            const { data } = await api.post('/ai/ask', {
                query,
                businessId: selectedBusiness?._id || selectedBusiness?.id,
                currentCash: financialMetrics.cashBalance,
                systemContext: aiGroundingPayload,
                metrics: {
                    totalSales: financialMetrics.totalRevenue,
                    totalExpenses: financialMetrics.totalExpenses,
                    netProfit: financialMetrics.netProfit,
                    profitMargin: financialMetrics.profitMargin,
                    totalReceivables: financialMetrics.totalReceivables,
                    salesCount: financialMetrics.salesCount,
                    expensesCount: financialMetrics.expensesCount,
                    burnRate: financialMetrics.dailyBurn,
                    runwayDays: financialMetrics.runwayDays,
                },
                situation
            });

            if (data.steps) {
                setActiveSteps(data.steps.map((s, idx) => ({
                    id: s.id || `step-${idx}`,
                    message: s.message || s.step,
                    status: s.status || 'done'
                })));
            } else {
                setActiveSteps([
                    { id: 1, message: 'Intent analysis complete', status: 'done' },
                    { id: 2, message: 'Models selected', status: 'done' },
                    { id: 3, message: 'Ledger query complete', status: 'done' },
                    { id: 4, message: 'Synthesizing insights', status: 'done' }
                ]);
            }

            setToolsUsed(data.toolsUsed || ['calculator', 'search_data', 'analyze_trends']);

            const aiMsg = {
                id: `ai-${Date.now()}`,
                role: 'ai',
                content: data.response,
                toolsUsed: data.toolsUsed,
                classification: data.classification,
                duration: data.duration || null,
                chartData: data.chartData,
                isFastPath: data.isFastPath
            };

            setChatHistory(prev => [...prev, aiMsg]);
            fetchSituation();
        } catch (error) {
            console.error(error);
            setActiveSteps([{ id: 1, message: 'Protocol interruption', status: 'error' }]);
            setChatHistory(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'ai',
                content: 'My cognitive functions encountered a localized error. Please retry the query.'
            }]);
        }
        setLoading(false);
    }, [userQuery, selectedBusiness, financialMetrics, aiGroundingPayload, situation, fetchSituation]);

    const handleReset = () => {
        setChatHistory([]);
        setActiveSteps([]);
        setToolsUsed([]);
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30">
            <Sidebar />
            <div className="flex-1 flex relative">
                <main className="flex-1 flex flex-col relative z-10 w-full lg:max-w-[calc(100%-400px)]">
                    <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-3xl z-20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/20 group">
                                <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-white tracking-tight uppercase">Cashly Intelligence</h1>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[10px] uppercase tracking-[3px] text-white/40 font-black">Neural Processing Active</span>
                                </div>
                            </div>
                        </div>
                        {chatHistory.length > 0 && (
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all border border-white/5 group"
                                title="Reset Session"
                            >
                                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Clear Thread</span>
                            </button>
                        )}
                    </div>
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {chatHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
                                <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 rounded-full flex items-center justify-center border border-white/5 shadow-2xl shadow-indigo-500/10">
                                        <Bot className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">How can I assist you?</h2>
                                    <p className="text-white/40 max-w-md mx-auto">I can analyze your ledgers, forecast cash flow, or detect anomalies in your financial data.</p>
                                </Motion.div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl px-4">
                                    {prebuiltPrompts.map((item, idx) => (
                                        <Motion.button
                                            key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 + 0.2 }}
                                            onClick={() => handleQuerySubmit(item.prompt)}
                                            className={cn("p-4 text-left rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br hover:bg-opacity-30", item.color)}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-black/20">{item.icon}</div>
                                                <span className="font-bold text-sm">{item.title}</span>
                                            </div>
                                            <p className="text-xs opacity-70 pl-1">{item.prompt}</p>
                                        </Motion.button>
                                    ))}
                                </div>
                                {financialMetrics.hasRealData && (
                                    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl px-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Revenue</p>
                                            <p className="text-lg font-bold text-emerald-400">{formatCurrency(financialMetrics.totalRevenue)}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Expenses</p>
                                            <p className="text-lg font-bold text-rose-400">{formatCurrency(financialMetrics.totalExpenses)}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Net Profit</p>
                                            <p className={cn("text-lg font-bold", financialMetrics.netProfit >= 0 ? "text-indigo-400" : "text-amber-400")}>{formatCurrency(financialMetrics.netProfit)}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Margin</p>
                                            <p className="text-lg font-bold text-white">{financialMetrics.profitMargin}%</p>
                                        </div>
                                    </Motion.div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6 max-w-3xl mx-auto">
                                {chatHistory.map((msg, idx) => {
                                    const isLast = idx === chatHistory.length - 1;
                                    return (
                                        <Motion.div
                                            key={msg.id || `msg-${idx}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn("flex w-full gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}
                                        >
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg", msg.role === 'user' ? "bg-white/10 text-white" : "bg-indigo-600 text-white shadow-indigo-500/20")}>
                                                {msg.role === 'user' ? <div className="font-bold text-xs">YOU</div> : <Bot className="w-5 h-5" />}
                                            </div>
                                            <div className={cn("max-w-[85%] rounded-3xl px-6 py-5 text-sm leading-relaxed shadow-sm", msg.role === 'user' ? "bg-white/10 text-white border border-white/5" : "bg-white/5 border border-white/10 text-white/90")}>
                                                {msg.role === 'ai' && msg.classification && (
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 uppercase tracking-widest">Intent: {msg.classification.category}</span>
                                                        <span className="text-[10px] text-white/30 italic capitalize">{msg.classification.tone}</span>
                                                    </div>
                                                )}
                                                <div className="structured-content">
                                                    {msg.role === 'ai' ? (
                                                        <StructuredResponse
                                                            content={msg.content || "Analyzing financial data..."}
                                                            animate={isLast && loading === false}
                                                        />
                                                    ) : <p className="text-white/90 leading-relaxed font-medium">{msg.content}</p>}
                                                </div>
                                                {msg.role === 'ai' && msg.chartData && (
                                                    <div className="mt-6 mb-2 p-4 rounded-2xl bg-black/40 border border-white/5 h-64 w-full">
                                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4 font-bold">Projected Cash Balance</p>
                                                        <ResponsiveContainer width="100%" height="85%">
                                                            <AreaChart data={msg.chartData}>
                                                                <defs>
                                                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} minTickGap={30} />
                                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} />
                                                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: '#6366f1' }} />
                                                                <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                )}
                                                {msg.role === 'ai' && (msg.toolsUsed || msg.duration) && (
                                                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-white/10">
                                                        {msg.toolsUsed?.map((tool, i) => (
                                                            <span key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-mono border border-indigo-500/20 uppercase tracking-wider"><Terminal className="w-3 h-3" /> {tool}</span>
                                                        ))}
                                                        {msg.duration && (
                                                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/20 uppercase tracking-wider"><Clock className="w-3 h-3" /> {msg.duration}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Motion.div>
                                    );
                                })}
                                {loading && (
                                    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-none px-6 py-4 flex flex-col gap-2">
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                            <p className="text-[10px] text-indigo-300 font-mono animate-pulse">{activeSteps[activeSteps.length - 1]?.message || 'Synthesizing...'}</p>
                                        </div>
                                    </Motion.div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-6 pt-2 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
                        <div className="max-w-4xl mx-auto relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-40 transition blur-sm" />
                            <div className="relative flex items-center gap-3 bg-black/90 border border-white/10 rounded-2xl p-2 pl-3 shadow-2xl">
                                <input
                                    type="text"
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleQuerySubmit(userQuery)}
                                    placeholder="Ask about your financial health, anomalies, or forecasts..."
                                    className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-white/30 h-10"
                                    disabled={loading}
                                />
                                <button
                                    onClick={() => handleQuerySubmit(userQuery)}
                                    disabled={loading || !userQuery.trim()}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                <aside className="w-[400px] hidden lg:flex flex-col border-l border-white/5 bg-black/20 backdrop-blur-3xl relative z-20">
                    <div className="p-8 border-b border-white/5">
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[4px] mb-6 flex items-center gap-3"><Cpu className="w-4 h-4 text-indigo-500" /> Neural Architecture</h3>
                        <div className="flex items-center gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/5 shadow-inner">
                            <div className="relative">
                                <div className={cn("w-3 h-3 rounded-full", loading ? "bg-indigo-500 shadow-[0_0_15px_#6366f1]" : "bg-emerald-500 shadow-[0_0_15px_#10b981]")} />
                                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-50", loading ? "bg-indigo-500" : "bg-emerald-500")} />
                            </div>
                            <div>
                                <div className="text-xs font-black text-white uppercase tracking-widest">{loading ? 'Synthesizing...' : 'Systems Optimal'}</div>
                                <div className="text-[10px] text-white/20 font-bold mt-1 uppercase tracking-wider">
                                    {situation?.telemetry?.latency?.toFixed(0) || '24'}ms Latency • Node active
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[4px] flex items-center gap-3"><Activity className="w-4 h-4 text-indigo-400" /> Live Telemetry</h3>
                                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black border border-emerald-500/20 flex items-center gap-1.5 tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> GRID ONLINE
                                </div>
                            </div>
                            <div className="h-40 w-full bg-white/[0.01] border border-white/5 rounded-[32px] p-6 flex items-end gap-1 overflow-hidden relative group shadow-inner">
                                <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d={`M -10 150 ${telemetryHistory.map((v, i) => `L ${(i / (telemetryHistory.length - 1)) * 100} ${100 - v}`).join(' ')} L 110 150 Z`} fill="url(#lineGrad)" className="transition-all duration-1000" />
                                    <path d={`M 0 ${100 - telemetryHistory[0]} ${telemetryHistory.map((v, i) => `L ${(i / (telemetryHistory.length - 1)) * 100} ${100 - v}`).join(' ')}`} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-1000" />
                                </svg>
                                <div className="absolute inset-x-0 bottom-3 px-6 flex justify-between text-[8px] text-white/20 font-black uppercase tracking-widest"><span>T-60s</span><span>Live</span></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 rounded-[20px] bg-white/[0.02] border border-white/5 text-center group hover:bg-white/[0.04] transition-colors">
                                    <p className="text-[8px] text-white/20 uppercase font-black tracking-widest mb-1 group-hover:text-white/40">Load</p>
                                    <p className="text-sm font-black text-white">{(telemetryHistory.reduce((a, b) => a + b, 0) / telemetryHistory.length).toFixed(0)}%</p>
                                </div>
                                <div className="p-4 rounded-[20px] bg-white/[0.02] border border-white/5 text-center group hover:bg-white/[0.04] transition-colors">
                                    <p className="text-[8px] text-white/20 uppercase font-black tracking-widest mb-1 group-hover:text-white/40">Peak</p>
                                    <p className="text-sm font-black text-white">{Math.max(...telemetryHistory).toFixed(0)}%</p>
                                </div>
                                <div className="p-4 rounded-[20px] bg-white/[0.02] border border-white/5 text-center group hover:bg-white/[0.04] transition-colors">
                                    <p className="text-[8px] text-white/20 uppercase font-black tracking-widest mb-1 group-hover:text-white/40">Ping</p>
                                    <p className="text-sm font-black text-white">{situation?.telemetry?.latency?.toFixed(0) || '24'}ms</p>
                                </div>
                            </div>
                        </div>
                        {situation && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-5">
                                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-400" /> Situation Room</h3>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Health Score</p>
                                            <p className={cn("text-2xl font-black", situation.healthScore > 80 ? "text-emerald-400" : situation.healthScore > 50 ? "text-amber-400" : "text-rose-400")}>{situation.healthScore}%</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                                            <svg className="w-full h-full -rotate-90">
                                                <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4" stroke={situation.healthScore > 80 ? "#10b981" : situation.healthScore > 50 ? "#f59e0b" : "#f43f5e"} strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * situation.healthScore) / 100} className="transition-all duration-1000" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <p className="text-[40px] font-black leading-tight tracking-tighter text-white">{(situation.runway ?? financialMetrics.runwayDays) >= 365 ? '365+' : (situation.runway ?? financialMetrics.runwayDays)}<span className="text-sm font-bold text-white/40 ml-2 uppercase tracking-widest">Days Runway</span></p>
                                        <div className="mt-2 flex items-center gap-4 border-t border-white/5 pt-3">
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase font-bold">Cash Balance</p>
                                                <p className="text-sm font-bold text-white">{formatCurrency(financialMetrics.cashBalance)}</p>
                                            </div>
                                            <div className="w-px h-8 bg-white/5" />
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase font-bold">Daily Burn</p>
                                                <p className="text-sm font-bold text-rose-400">{formatCurrency(financialMetrics.dailyBurn)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                </div>
                                {situation.inflowOpportunity && (
                                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Inflow Opportunity</p>
                                            <Clock className="w-3 h-3 text-indigo-400/50" />
                                        </div>
                                        <p className="text-sm font-bold text-white mb-1">Collect from {situation.inflowOpportunity.customerName}</p>
                                        <p className="text-xs text-white/50 mb-3">{situation.inflowOpportunity.daysOverdue} days overdue</p>
                                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(situation.inflowOpportunity.amountDue)}</p>
                                    </div>
                                )}
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-white/40" /><p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Velocity Analysis</p></div>
                                    <p className="text-xs text-white/80 leading-relaxed">Spending velocity has <span className={cn("font-bold", (situation.velocity?.change || 0) > 0 ? "text-rose-400" : "text-emerald-400")}>{(situation.velocity?.change || 0) > 0 ? 'increased' : 'decreased'} by {Math.abs(situation.velocity?.change || 0)}%</span> compared to last week.</p>
                                    <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className={cn("h-full transition-all duration-1000", (situation.velocity?.change || 0) > 0 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]")} style={{ width: `${Math.min(100, 50 + (situation.velocity?.change || 0))}%` }} />
                                    </div>
                                    <div className="flex justify-between mt-1 pt-1 opacity-20"><span className="text-[8px] font-bold">LAST WEEK</span><span className="text-[8px] font-bold">CURRENT</span></div>
                                </div>
                            </div>
                        )}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black text-white/40 uppercase tracking-[4px] flex items-center gap-3"><Activity className="w-4 h-4 text-indigo-500" /> Execution Pipeline</h3>
                                {loading && <span className="text-[8px] font-black text-indigo-400 animate-pulse tracking-widest uppercase bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">Processing</span>}
                            </div>
                            <div className="space-y-4 relative">
                                {activeSteps.length > 0 ? (
                                    <>
                                        {activeSteps.map((step, idx) => (
                                            <Motion.div
                                                key={step.id || idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="flex gap-4 group relative"
                                            >
                                                {idx !== activeSteps.length - 1 && (
                                                    <div className="absolute left-2 top-6 bottom-[-16px] w-[1px] bg-gradient-to-b from-indigo-500/40 via-white/5 to-transparent" />
                                                )}
                                                <div className="relative z-10 pt-1">
                                                    {step.status === 'done' ? (
                                                        <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center">
                                                            <CheckCircle2 className="w-3 h-3 text-black" />
                                                        </div>
                                                    ) : step.status === 'error' ? (
                                                        <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] flex items-center justify-center">
                                                            <AlertTriangle className="w-3 h-3 text-white" />
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-4 h-4">
                                                            <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full" />
                                                            <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <div className={cn(
                                                        "text-[11px] font-black tracking-widest uppercase transition-colors",
                                                        step.status === 'done' ? "text-emerald-400" : step.status === 'error' ? "text-rose-400" : "text-white group-hover:text-indigo-400"
                                                    )}>
                                                        {step.message}
                                                    </div>
                                                    {step.status === 'running' && (
                                                        <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <Motion.div
                                                                className="h-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"
                                                                initial={{ width: "0%" }}
                                                                animate={{ width: "100%" }}
                                                                transition={{ duration: 2, repeat: Infinity }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </Motion.div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="text-center py-12 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                                        <div className="w-2.5 h-2.5 bg-white/10 rounded-full mx-auto mb-4 animate-[pulse_3s_infinite]" />
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[4px]">Neural Pipeline IDLE</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {toolsUsed.length > 0 && (
                            <div className="animate-in slide-in-from-bottom-5">
                                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2"><Terminal className="w-4 h-4" /> Active Tools</h3>
                                <div className="flex flex-wrap gap-2">{toolsUsed.map((tool, idx) => (<div key={idx} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">{tool}</div>))}</div>
                            </div>
                        )}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Core Modules</h3>
                            <div className="space-y-3">
                                {[
                                    { label: "Cash Flow Forecasting", color: "bg-emerald-500" },
                                    { label: "Expense Optimization", color: "bg-rose-500" },
                                    { label: "Anomaly Detection", color: "bg-amber-500" },
                                    { label: "Strategic Planning", color: "bg-indigo-500" },
                                ].map((cap, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={cn("w-1.5 h-1.5 rounded-full shadow-lg shadow-white/10", cap.color)} />
                                        <span className="text-xs text-white/70">{cap.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[30%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
                </div>
            </div>
        </div>
    );
};

export default AIAnalysisPage;
