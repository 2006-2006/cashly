import { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, TrendingUp, TrendingDown, Upload, Sparkles, Settings, Zap, Activity, Menu, X, GitMerge } from 'lucide-react';
import AuthContext from '../contexts/AuthContext';
import { motion as Motion, AnimatePresence } from 'framer-motion';

export const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const handleLogoutClick = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
            navigate('/login');
        }
    };

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/income', icon: TrendingUp, label: 'Income' },
        { path: '/expenses', icon: TrendingDown, label: 'Expenses' },
        { path: '/receivables', icon: Zap, label: 'Due Payers' },
        { path: '/reconciliation', icon: GitMerge, label: 'Reconcile' },
        { path: '/upload', icon: Upload, label: 'Upload Data' },
        { path: '/ai-analysis', icon: Sparkles, label: 'AI Analysis' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const userInitial = (userName[0] || 'U').toUpperCase();

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-black/95 backdrop-blur-3xl border-r border-white/5 py-8 px-4 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />

            {/* Header / Logo */}
            <div className="flex items-center justify-between mb-12 px-2">
                <div onClick={() => { navigate('/dashboard'); setIsOpen(false); }} className="cursor-pointer group flex items-center gap-3">
                    <div className="relative w-8 h-8 flex items-center justify-center bg-black rounded-lg border border-white/10 overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.8)] transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                        <Activity className="w-5 h-5 text-white relative z-10 transform group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tighter text-white leading-none group-hover:text-indigo-200 transition-colors">
                            CASHLY
                        </span>
                        <span className="text-[8px] font-bold tracking-[0.3em] text-indigo-400 uppercase leading-none opacity-0 group-hover:opacity-100 transition-all duration-300">
                            Enterprise
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden p-2 text-white/40 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation - Vertical List */}
            <nav className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar pb-6">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.path}
                            onClick={() => { navigate(item.path); setIsOpen(false); }}
                            className={`relative group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 w-full text-left ${active
                                ? 'bg-[#3E50F3] text-white shadow-[0_0_20px_rgba(62,80,243,0.3)] z-10'
                                : 'bg-transparent text-white/40 hover:bg-[#121212] hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'fill-current scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'}`} strokeWidth={active ? 2.5 : 2} />
                            <span className={`text-sm tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>
                                {item.label}
                            </span>
                            {active && (
                                <Motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white/5 rounded-xl pointer-events-none"
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User Profile - Bottom */}
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between px-2">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { navigate('/settings'); setIsOpen(false); }}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg hover:scale-105 transition-transform">
                        {userInitial}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white leading-none group-hover:text-indigo-400 transition-colors uppercase tracking-tighter">
                            {userName.split(' ')[0]}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-emerald-500/70 font-black uppercase tracking-widest">Active</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogoutClick}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all border border-white/5 group"
                    title="Sign Out"
                >
                    <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Navigation Toggle - "Neural Command" */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed bottom-6 left-6 z-[200] p-4 bg-indigo-600 text-white rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.4)] border border-white/20 active:scale-95 transition-all"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Mobile Sidebar - Drawer Style */}
            <AnimatePresence>
                {isOpen && (
                    <div className="lg:hidden fixed inset-0 z-[1000]">
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <Motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute inset-y-0 left-0 w-72"
                        >
                            <SidebarContent />
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar - Persistent */}
            <aside className="hidden lg:flex w-64 h-screen flex-col sticky top-0 z-[100]">
                <SidebarContent />
            </aside>
        </>
    );
};

export default Sidebar;
