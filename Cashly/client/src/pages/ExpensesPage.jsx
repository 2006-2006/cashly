import { useState, useEffect, useContext, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingDown, Zap, Search, Download, AlertCircle, RefreshCw
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { formatCurrency, formatDate } from '../lib/formatters';
import AuthContext from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ExpensesPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
    const [categoryFilter, setCategoryFilter] = useState('all');
    const LIMIT = 100;

    const fetchExpenses = useCallback(async (isInitial = true) => {
        if (!selectedBusiness?.id) {
            setExpenses([]);
            setFilteredExpenses([]);
            setLoading(false);
            return;
        }

        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        try {
            const currentCount = isInitial ? 0 : expenses.length;
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('business_id', selectedBusiness.id)
                .order('date', { ascending: false })
                .range(currentCount, currentCount + LIMIT - 1);

            if (error) throw error;

            if (isInitial) {
                setExpenses(data || []);
                setFilteredExpenses(data || []);
            } else {
                setExpenses(prev => [...prev, ...(data || [])]);
            }

            if (!data || data.length < LIMIT) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedBusiness, expenses.length]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchExpenses(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    useEffect(() => {
        let result = [...expenses];

        // Search
        if (searchTerm) {
            result = result.filter(e =>
                (e.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (e.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }

        // Category Filter
        if (categoryFilter !== 'all') {
            result = result.filter(e => e.category === categoryFilter);
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'highest') return b.amount - a.amount;
            if (sortBy === 'lowest') return a.amount - b.amount;
            return 0;
        });

        setFilteredExpenses(result);
    }, [searchTerm, sortBy, categoryFilter, expenses]);

    const handleExport = () => {
        if (!filteredExpenses || filteredExpenses.length === 0) return;

        const headers = ['Date', 'Category', 'Description', 'Amount', 'ID'];
        const csvContent = [
            headers.join(','),
            ...filteredExpenses.map(row => [
                formatDate(row.date),
                row.category,
                `"${(row.description || '').replace(/"/g, '""')}"`,
                row.amount,
                row.id
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `expense_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    // Daily average based on actual data span, not a hardcoded 30
    const expDates = expenses.map(e => new Date(e.date)).filter(d => !isNaN(d));
    const spanDays = expDates.length >= 2
        ? Math.max(1, Math.round((Math.max(...expDates) - Math.min(...expDates)) / 86_400_000))
        : 30;
    const avgDailyExpense = spanDays > 0 ? totalExpenses / spanDays : 0;

    const uniqueCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))];


    const getCategoryColor = (cat) => {
        const c = cat?.toLowerCase();
        if (c?.includes('marketing')) return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
        if (c?.includes('supply') || c?.includes('inventory')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        if (c?.includes('salary') || c?.includes('payroll')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (c?.includes('rent') || c?.includes('office')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        if (c?.includes('utility') || c?.includes('electricity')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    return (
        <div className="min-h-screen w-full bg-black text-white flex font-sans selection:bg-indigo-500/30">
            <Sidebar onLogout={() => { }} />

            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#020202]">
                <div className="max-w-7xl mx-auto space-y-8 pb-20">

                    {/* Header Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 rounded-3xl bg-gradient-to-br from-red-900/20 to-black border border-white/5 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <TrendingDown className="w-40 h-40 text-red-500" />
                        </div>
                        <div className="relative z-10">
                            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Expense Distribution</h1>
                            <p className="text-sm text-red-200/60 font-medium">Monitoring {uniqueCategories.length} active cost centers</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 relative z-10">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Burn</p>
                                <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalExpenses)}</div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Daily Average</p>
                                <div className="text-3xl font-bold text-red-400 tracking-tight">{formatCurrency(avgDailyExpense)}</div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Transactions</p>
                                <div className="text-3xl font-bold text-white tracking-tight">{expenses.length}</div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Categories</p>
                                <div className="text-3xl font-bold text-red-300 tracking-tight">{uniqueCategories.length}</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col md:flex-row gap-4"
                    >
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4 group-focus-within:text-red-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search burn records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-sm transition-all hover:bg-white/10"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-widest text-white/70 focus:outline-none focus:bg-black transition-all cursor-pointer hover:bg-white/10"
                            >
                                <option value="all">All Channels</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="flex-1 md:flex-none px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-widest text-white/70 focus:outline-none focus:bg-black transition-all cursor-pointer hover:bg-white/10"
                            >
                                <option value="newest">Latest First</option>
                                <option value="oldest">Historical First</option>
                                <option value="highest">Burn: Highest</option>
                                <option value="lowest">Burn: Lowest</option>
                            </select>
                            <button onClick={handleExport} className="p-3 bg-white/5 border border-white/5 rounded-xl shadow-lg hover:bg-white/10 transition-all group">
                                <Download className="w-4 h-4 text-white/50 group-hover:text-red-400" />
                            </button>
                        </div>
                    </motion.div>

                    {/* Table */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#0A0A0B]/80 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl"
                    >
                        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Expenditure Ledger</h3>
                            <button onClick={handleExport} className="text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1 rounded-full transition-colors uppercase tracking-widest border border-white/5">
                                Export CSV
                            </button>
                        </div>

                        {/* Expenditure List - Adaptive Layout */}
                        {loading ? (
                            <div className="text-center py-32">
                                <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Loading Data...</p>
                            </div>
                        ) : filteredExpenses.length === 0 ? (
                            <div className="text-center py-32">
                                <AlertCircle className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                <h2 className="text-lg font-bold text-white mb-2">No results found</h2>
                                <p className="text-white/40 text-sm">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <div className="w-full">
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/[0.01]">
                                                <th className="py-4 px-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">Date / ID</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">Category</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">Description</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Debit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredExpenses.map((expense, idx) => (
                                                <tr key={expense.id || idx} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-white/90">
                                                                {formatDate(expense.date)}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-white/30 mt-1">
                                                                ID: {expense.id?.slice(-6).toUpperCase() || `EX-${idx}`}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${getCategoryColor(expense.category)}`}>
                                                            {expense.category || 'Maintenance'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{expense.description || 'Expense Entry'}</span>
                                                            <span className="text-[10px] text-red-500/80 flex items-center gap-1 mt-0.5">
                                                                <Zap className="w-3 h-3" /> Processed
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <span className="text-base font-bold text-white/90">
                                                            -{formatCurrency(expense.amount)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden divide-y divide-white/5">
                                    {filteredExpenses.map((expense, idx) => (
                                        <div key={expense.id || idx} className="p-5 active:bg-white/5 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">
                                                        {formatDate(expense.date)}
                                                    </span>
                                                    <p className="text-sm font-bold text-white leading-tight">{expense.description || 'Expense Entry'}</p>
                                                </div>
                                                <span className="text-base font-black text-red-400">
                                                    -{formatCurrency(expense.amount)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getCategoryColor(expense.category)}`}>
                                                    {expense.category || 'Maintenance'}
                                                </span>
                                                <span className="text-[9px] font-mono text-white/20">
                                                    #{expense.id?.slice(-6).toUpperCase() || `EX-${idx}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {hasMore && !loading && (
                            <div className="p-8 border-t border-white/5 text-center bg-white/[0.01]">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-xs font-bold uppercase tracking-[2px] transition-all border border-red-500/20 disabled:opacity-50 flex items-center gap-3 mx-auto"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                            Syncing Ledger...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Load 100 More Records
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default ExpensesPage;
