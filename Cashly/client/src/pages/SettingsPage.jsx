import { useState, useContext, useEffect, useRef } from 'react';
import {
    Trash2, AlertTriangle, User, ShieldAlert, ShieldCheck,
    Bell, BellOff, Palette, Database, LogOut, Building2,
    Lock, Unlock, Eye, EyeOff, Check, X, ChevronRight,
    Download, RefreshCw, Loader2, KeyRound, Mail,
    Globe, IndianRupee, Moon, Zap, Save, Edit3,
    CheckCircle2, Info, CreditCard, BarChart3
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import AuthContext from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../lib/formatters';

/* ─── small reusable helpers ─── */
const SectionHeader = ({ icon: Icon, label, color = 'text-indigo-400' }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${color}`}>
            <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-xs font-black text-white/50 uppercase tracking-[0.35em]">{label}</h2>
    </div>
);

const Card = ({ children, className = '', danger = false }) => (
    <div className={`relative p-6 rounded-3xl border backdrop-blur-sm overflow-hidden ${danger
        ? 'bg-[#0a0202] border-red-900/30'
        : 'bg-white/[0.03] border-white/[0.07]'
        } ${className}`}>
        {children}
    </div>
);

const Toggle = ({ checked, onChange, color = 'bg-indigo-500', label }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${checked ? `${color} shadow-[0_0_12px_rgba(99,102,241,0.4)]` : 'bg-white/10 border border-white/10'}`}
        aria-label={label}
    >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? 'translate-x-5' : ''}`} />
    </button>
);

const Row = ({ label, sublabel, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
        <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            {sublabel && <p className="text-xs text-white/30 mt-0.5">{sublabel}</p>}
        </div>
        <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
);

/* ─── Notification Toast ─── */
const Toast = ({ toast }) => (
    <AnimatePresence>
        {toast && (
            <Motion.div
                initial={{ opacity: 0, y: -50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -50, x: '-50%' }}
                className={`fixed top-6 left-1/2 z-50 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 ${toast.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : toast.type === 'error'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    }`}
            >
                {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : toast.type === 'error' ? <X className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                <span className="text-xs font-bold">{toast.message}</span>
            </Motion.div>
        )}
    </AnimatePresence>
);

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
const SettingsPage = () => {
    const { user, selectedBusiness, businesses, selectBusiness, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    /* ── toast ── */
    const [toast, setToast] = useState(null);
    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    /* ── active tab ── */
    const [activeTab, setActiveTab] = useState('profile');

    /* ── profile section ── */
    const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
    const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
    const [changingPw, setChangingPw] = useState(false);

    const handleChangePassword = async () => {
        if (!passwordForm.current) return showToast('error', 'Please enter your current password.');
        if (passwordForm.next.length < 8) return showToast('error', 'Password must be at least 8 characters.');
        if (passwordForm.next !== passwordForm.confirm) return showToast('error', 'Passwords do not match.');
        setChangingPw(true);
        try {
            // 1. Verify current password
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordForm.current,
            });
            if (verifyError) throw new Error('Incorrect current password.');

            // 2. Update to new password
            const { error } = await supabase.auth.updateUser({ password: passwordForm.next });
            if (error) throw error;
            
            showToast('success', 'Password updated successfully.');
            setPasswordForm({ current: '', next: '', confirm: '' });
        } catch (e) {
            showToast('error', e.message || 'Failed to update password.');
        }
        setChangingPw(false);
    };

    /* ── security section ── */
    const lockEnabledKey = `cashly_lock_enabled_${user?.id}`;
    const lockPinKey = `cashly_lock_pin_${user?.id}`;
    const [lockEnabled, setLockEnabled] = useState(() =>
        typeof window !== 'undefined' && localStorage.getItem(lockEnabledKey) === 'true'
    );
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [pinDigits, setPinDigits] = useState(['', '', '', '']);
    const pinRefs = useRef([]);

    const handlePinChange = (i, val) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...pinDigits];
        next[i] = val.slice(-1);
        setPinDigits(next);
        if (val && i < 3) pinRefs.current[i + 1]?.focus();
    };

    const handlePinKey = (i, e) => {
        if (e.key === 'Backspace' && !pinDigits[i] && i > 0) pinRefs.current[i - 1]?.focus();
    };

    const savePin = () => {
        const pin = pinDigits.join('');
        if (pin.length !== 4) return;
        localStorage.setItem(lockEnabledKey, 'true');
        localStorage.setItem(lockPinKey, pin);
        setLockEnabled(true);
        setShowPinSetup(false);
        setPinDigits(['', '', '', '']);
        showToast('success', 'PIN Lock activated.');
    };

    const disableLock = () => {
        localStorage.removeItem(lockEnabledKey);
        localStorage.removeItem(lockPinKey);
        setLockEnabled(false);
        showToast('success', 'PIN Lock disabled.');
    };

    /* ── notifications section ── */
    const notifKey = `cashly_notif_${user?.id}`;
    const defaultNotif = { cashAlerts: true, weeklyReport: false, overduePings: true, systemUpdates: false };
    const [notif, setNotif] = useState(() => {
        try { return JSON.parse(localStorage.getItem(notifKey)) || defaultNotif; } catch { return defaultNotif; }
    });

    const toggleNotif = (key) => {
        const updated = { ...notif, [key]: !notif[key] };
        setNotif(updated);
        localStorage.setItem(notifKey, JSON.stringify(updated));
        showToast('info', `${key.replace(/([A-Z])/g, ' $1')} ${updated[key] ? 'enabled' : 'disabled'}.`);
    };

    /* ── appearance section ── */
    const appearKey = `cashly_appear_${user?.id}`;
    const defaultAppear = { currency: 'INR', dateFormat: 'DD/MM/YYYY', compactNumbers: true, animationsEnabled: true };
    const [appear, setAppear] = useState(() => {
        try { return JSON.parse(localStorage.getItem(appearKey)) || defaultAppear; } catch { return defaultAppear; }
    });

    const updateAppear = (key, val) => {
        const updated = { ...appear, [key]: val };
        setAppear(updated);
        localStorage.setItem(appearKey, JSON.stringify(updated));
        showToast('success', 'Preference saved. Refreshing...');
        setTimeout(() => window.location.reload(), 800);
    };

    /* ── data management ── */
    const [showWipe, setShowWipe] = useState(false);
    const [wiping, setWiping] = useState(false);
    const [wipeConfirmText, setWipeConfirmText] = useState('');
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (!selectedBusiness) return showToast('error', 'No business selected.');
        setExporting(true);
        try {
            const businessId = selectedBusiness?._id || selectedBusiness?.id;
            const [salesRes, expRes, recRes] = await Promise.all([
                supabase.from('sales').select('*').eq('business_id', businessId),
                supabase.from('expenses').select('*').eq('business_id', businessId),
                supabase.from('receivables').select('*').eq('business_id', businessId),
            ]);
            const exportData = {
                exportedAt: new Date().toISOString(),
                business: selectedBusiness?.name,
                sales: salesRes.data || [],
                expenses: expRes.data || [],
                receivables: recRes.data || [],
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cashly-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('success', 'Data exported successfully.');
        } catch (e) {
            showToast('error', 'Export failed. Please try again.');
        }
        setExporting(false);
    };

    const handleWipe = async () => {
        if (wipeConfirmText.trim().toLowerCase() !== 'delete') return showToast('error', 'Type "delete" to confirm.');
        setWiping(true);
        try {
            const { data } = await api.delete('/settings/clear-data');
            showToast('success', `Wiped ${(data?.deleted?.sales || 0) + (data?.deleted?.expenses || 0)} records.`);
            setShowWipe(false);
            setWipeConfirmText('');
            setTimeout(() => window.location.reload(), 1800);
        } catch (e) {
            showToast('error', 'Wipe failed. Please try again.');
        }
        setWiping(false);
    };

    /* ── logout ── */
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    /* ── tabs ── */
    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'business', label: 'Business', icon: Building2 },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'notifications', label: 'Alerts', icon: Bell },
        { id: 'appearance', label: 'Display', icon: Palette },
        { id: 'data', label: 'Data', icon: Database },
    ];

    /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
    return (
        <div className="flex h-screen bg-[#02040a] text-white overflow-hidden font-sans">
            <Sidebar />

            {/* ambient glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[5%] left-[30%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[140px]" />
                <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-900/8 blur-[120px]" />
            </div>

            <Toast toast={toast} />

            <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
                <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 pb-24 space-y-8">

                    {/* ── Header ── */}
                    <Motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-px w-8 bg-indigo-500/60" />
                            <span className="text-[9px] font-black uppercase tracking-[0.45em] text-indigo-400">Configuration</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-white">Settings</h1>
                        <p className="text-white/30 text-sm mt-1">Manage your account, security, and preferences.</p>
                    </Motion.header>

                    {/* ── User Identity Banner ── */}
                    <Motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                        className="flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30 flex-shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold text-white truncate">{displayName}</p>
                            <p className="text-xs text-white/40 font-mono truncate">{user?.email}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
                        </div>
                    </Motion.div>

                    {/* ── Tab Nav ── */}
                    <Motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                        className="flex gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-x-auto no-scrollbar"
                    >
                        {tabs.map(t => {
                            const Icon = t.icon;
                            const active = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 flex-shrink-0 ${active
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </Motion.div>

                    {/* ─────────────────────────────────────────────────────────────────
                        TAB CONTENT
                    ───────────────────────────────────────────────────────────────── */}
                    <AnimatePresence mode="wait">
                        <Motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            {/* ══ PROFILE ══ */}
                            {activeTab === 'profile' && (
                                <div className="space-y-4">
                                    <Card>
                                        <SectionHeader icon={User} label="Account Details" />
                                        <Row label="Display Name" sublabel="Pulled from your account">
                                            <span className="text-sm text-white/60 font-mono">{displayName}</span>
                                        </Row>
                                        <Row label="Email Address" sublabel="Your login email">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5 text-white/20" />
                                                <span className="text-sm text-white/60 font-mono truncate max-w-[200px]">{user?.email}</span>
                                            </div>
                                        </Row>
                                        <Row label="Account ID" sublabel="Unique identifier">
                                            <span className="text-[11px] text-white/30 font-mono bg-white/5 px-2 py-1 rounded-lg">
                                                {user?.id?.slice(0, 8).toUpperCase() || '—'}
                                            </span>
                                        </Row>
                                        <Row label="Account Created" sublabel="Registration date">
                                            <span className="text-sm text-white/40">
                                                {user?.created_at ? formatDate(user.created_at) : '—'}
                                            </span>
                                        </Row>
                                    </Card>

                                    <Card>
                                        <SectionHeader icon={KeyRound} label="Change Password" color="text-amber-400" />
                                        <div className="space-y-4">
                                            {[
                                                { key: 'current', label: 'Current Password', placeholder: '••••••••' },
                                                { key: 'next', label: 'New Password', placeholder: 'Min 8 characters' },
                                                { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
                                            ].map(({ key, label, placeholder }) => (
                                                <div key={key}>
                                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1.5">{label}</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPw[key] ? 'text' : 'password'}
                                                            value={passwordForm[key]}
                                                            onChange={e => setPasswordForm(p => ({ ...p, [key]: e.target.value }))}
                                                            placeholder={placeholder}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 pr-10 transition-all"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                                        >
                                                            {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                onClick={handleChangePassword}
                                                disabled={changingPw || !passwordForm.next || !passwordForm.confirm}
                                                className="w-full py-3 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
                                            >
                                                {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {changingPw ? 'Updating…' : 'Update Password'}
                                            </button>
                                        </div>
                                    </Card>

                                    {/* Sign out from here too */}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-4 rounded-2xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 text-white/40 hover:text-red-400 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        Sign Out
                                    </button>
                                </div>
                            )}

                            {/* ══ BUSINESS ══ */}
                            {activeTab === 'business' && (
                                <div className="space-y-4">
                                    <Card>
                                        <SectionHeader icon={Building2} label="Your Businesses" color="text-purple-400" />
                                        {businesses.length === 0 ? (
                                            <div className="text-center py-10 text-white/30">
                                                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">No businesses linked yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {businesses.map(biz => {
                                                    const isActive = selectedBusiness?.id === biz.id;
                                                    return (
                                                        <button
                                                            key={biz.id}
                                                            onClick={() => { selectBusiness(biz); showToast('success', `Switched to ${biz.name}`); }}
                                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isActive
                                                                ? 'bg-indigo-600/10 border-indigo-500/30'
                                                                : 'bg-white/[0.02] border-white/[0.07] hover:bg-white/5 hover:border-white/15'
                                                                }`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/10 text-white/60'}`}>
                                                                {biz.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <p className="text-sm font-bold text-white truncate">{biz.name}</p>
                                                                <p className="text-[10px] text-white/30 font-mono truncate">{biz.id?.slice(0, 12)}…</p>
                                                            </div>
                                                            {isActive && (
                                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-widest flex-shrink-0">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                                                    Active
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Card>

                                    {selectedBusiness && (
                                        <Card>
                                            <SectionHeader icon={BarChart3} label="Active Business Details" color="text-cyan-400" />
                                            <Row label="Business Name" sublabel="Registered name">
                                                <span className="text-sm font-semibold text-white/70">{selectedBusiness.name}</span>
                                            </Row>
                                            <Row label="Business ID" sublabel="Unique database ID">
                                                <span className="text-[11px] font-mono text-white/30 bg-white/5 px-2 py-1 rounded-lg">{selectedBusiness.id?.slice(0, 12)}…</span>
                                            </Row>
                                            {selectedBusiness.created_at && (
                                                <Row label="Created On" sublabel="Business registration date">
                                                    <span className="text-sm text-white/40">{formatDate(selectedBusiness.created_at)}</span>
                                                </Row>
                                            )}
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* ══ SECURITY ══ */}
                            {activeTab === 'security' && (
                                <div className="space-y-4">
                                    <Card>
                                        <SectionHeader icon={Lock} label="PIN Lock" color="text-emerald-400" />
                                        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl border transition-all ${lockEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                                                    {lockEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">PIN Lock</p>
                                                    <p className="text-xs text-white/30 mt-0.5">{lockEnabled ? '4-digit PIN is active — app locked on next visit' : 'Protect your data with a PIN on launch'}</p>
                                                </div>
                                            </div>
                                            {lockEnabled ? (
                                                <button onClick={disableLock} className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all">Disable</button>
                                            ) : (
                                                <button onClick={() => setShowPinSetup(true)} className="flex-shrink-0 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all">Enable</button>
                                            )}
                                        </div>

                                        <AnimatePresence>
                                            {showPinSetup && !lockEnabled && (
                                                <Motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-5">
                                                        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70 mb-4">Enter 4-Digit PIN</p>
                                                        <div className="flex justify-center gap-3 mb-5">
                                                            {pinDigits.map((d, i) => (
                                                                <input
                                                                    key={i}
                                                                    ref={el => pinRefs.current[i] = el}
                                                                    type="password"
                                                                    value={d}
                                                                    maxLength={1}
                                                                    onChange={e => handlePinChange(i, e.target.value)}
                                                                    onKeyDown={e => handlePinKey(i, e)}
                                                                    className="w-12 h-14 rounded-2xl bg-black/60 border border-white/10 text-center text-white text-2xl font-black font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button onClick={() => { setShowPinSetup(false); setPinDigits(['', '', '', '']); }} className="py-3 rounded-xl bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                                                            <button
                                                                onClick={savePin}
                                                                disabled={pinDigits.join('').length !== 4}
                                                                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/30"
                                                            >Activate</button>
                                                        </div>
                                                    </div>
                                                </Motion.div>
                                            )}
                                        </AnimatePresence>

                                        {lockEnabled && (
                                            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <p className="text-xs text-emerald-300/70">Your app is protected. PIN will be requested on the next session.</p>
                                            </div>
                                        )}
                                    </Card>

                                    <Card>
                                        <SectionHeader icon={KeyRound} label="Session" color="text-amber-400" />
                                        <Row label="Session Provider" sublabel="Login method">
                                            <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-lg">Email / Password</span>
                                        </Row>
                                        <Row label="Last Sign In" sublabel="Most recent authentication">
                                            <span className="text-sm text-white/40">
                                                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </span>
                                        </Row>
                                        <div className="mt-4">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out of Cashly
                                            </button>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* ══ NOTIFICATIONS ══ */}
                            {activeTab === 'notifications' && (
                                <Card>
                                    <SectionHeader icon={Bell} label="Alert Preferences" color="text-blue-400" />
                                    <p className="text-xs text-white/30 mb-6 -mt-2">Preferences are saved locally on this device.</p>

                                    {[
                                        { key: 'cashAlerts', label: 'Low Cash Alerts', sub: 'Notify when cash runway drops below 30 days', icon: Zap, color: 'bg-amber-500' },
                                        { key: 'overduePings', label: 'Overdue Receivable Pings', sub: 'Alert when an invoice passes its due date', icon: Bell, color: 'bg-red-500' },
                                        { key: 'weeklyReport', label: 'Weekly Summary', sub: 'Get a weekly digest of your financial activity', icon: BarChart3, color: 'bg-indigo-500' },
                                        { key: 'systemUpdates', label: 'System Notifications', sub: 'Feature updates and platform announcements', icon: Info, color: 'bg-slate-500' },
                                    ].map(({ key, label, sub, icon: Icon, color }) => (
                                        <div key={key} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl ${color}/10 ${color.replace('bg-', 'text-')}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{label}</p>
                                                    <p className="text-xs text-white/30 mt-0.5">{sub}</p>
                                                </div>
                                            </div>
                                            <Toggle checked={notif[key]} onChange={() => toggleNotif(key)} label={label} />
                                        </div>
                                    ))}
                                </Card>
                            )}

                            {/* ══ APPEARANCE ══ */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-4">
                                    <Card>
                                        <SectionHeader icon={Palette} label="Display Preferences" color="text-violet-400" />
                                        <p className="text-xs text-white/30 mb-6 -mt-2">Preferences are saved locally on this device.</p>

                                        <Row label="Currency" sublabel="Primary currency for display">
                                            <div className="flex gap-2">
                                                {['INR'].map(cur => (
                                                    <button
                                                        key={cur}
                                                        onClick={() => updateAppear('currency', cur)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${appear.currency === cur
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                            }`}
                                                    >{cur}</button>
                                                ))}
                                            </div>
                                        </Row>

                                        <Row label="Date Format" sublabel="How dates are displayed throughout the app">
                                            <div className="flex gap-2">
                                                {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(fmt => (
                                                    <button
                                                        key={fmt}
                                                        onClick={() => updateAppear('dateFormat', fmt)}
                                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${appear.dateFormat === fmt
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                            }`}
                                                    >{fmt}</button>
                                                ))}
                                            </div>
                                        </Row>

                                        <Row label="Compact Numbers" sublabel="Show ₹1.2k instead of ₹1,200">
                                            <Toggle checked={appear.compactNumbers} onChange={v => updateAppear('compactNumbers', v)} label="Compact Numbers" />
                                        </Row>

                                        <Row label="Animations" sublabel="Enable page and widget animations">
                                            <Toggle checked={appear.animationsEnabled} onChange={v => updateAppear('animationsEnabled', v)} label="Animations" />
                                        </Row>
                                    </Card>

                                    <Card>
                                        <SectionHeader icon={Moon} label="Theme" color="text-slate-400" />
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'dark', label: 'Dark', preview: 'bg-[#02040a]' },
                                                { id: 'midnight', label: 'Midnight', preview: 'bg-[#000008]' },
                                                { id: 'slate', label: 'Slate', preview: 'bg-slate-900' },
                                            ].map(theme => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => updateAppear('theme', theme.id)}
                                                    className={`p-4 rounded-2xl border transition-all ${appear.theme === theme.id ? 'border-indigo-500/50 bg-indigo-600/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}
                                                >
                                                    <div className={`w-full h-8 rounded-xl ${theme.preview} border border-white/10 mb-2`} />
                                                    <p className="text-xs font-bold text-white/60">{theme.label}</p>
                                                    {appear.theme === theme.id && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                                                            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Active</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* ══ DATA ══ */}
                            {activeTab === 'data' && (
                                <div className="space-y-4">
                                    {/* Export */}
                                    <Card>
                                        <SectionHeader icon={Download} label="Export Data" color="text-cyan-400" />
                                        <p className="text-sm text-white/50 mb-5">
                                            Download all your sales, expenses, and receivables as a JSON file for backup or migration.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                                            {[
                                                { label: 'Sales', icon: BarChart3, color: 'text-emerald-400' },
                                                { label: 'Expenses', icon: CreditCard, color: 'text-rose-400' },
                                                { label: 'Receivables', icon: IndianRupee, color: 'text-indigo-400' },
                                            ].map(({ label, icon: Icon, color }) => (
                                                <div key={label} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                                                    <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                                                    <span className="text-xs font-semibold text-white/60">{label} included</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleExport}
                                            disabled={exporting || !selectedBusiness}
                                            className="w-full py-3.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-500/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
                                        >
                                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                            {exporting ? 'Exporting…' : 'Export as JSON'}
                                        </button>
                                    </Card>

                                    {/* Danger Zone */}
                                    <Card danger>
                                        <div className="absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(45deg,#ef4444_0,#ef4444_1px,transparent_0,transparent_40%)] bg-[size:12px_12px] pointer-events-none rounded-3xl" />

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/20 text-red-500">
                                                    <AlertTriangle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-white">Danger Zone</h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Irreversible Actions</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/30 mb-5">
                                                <p className="text-sm text-red-200/60 leading-relaxed">
                                                    Wiping your data will <strong className="text-red-300">permanently delete all sales, expenses, inventory, and receivables</strong> for the active business. This action cannot be undone.
                                                </p>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {!showWipe ? (
                                                    <Motion.button
                                                        key="init"
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                        onClick={() => setShowWipe(true)}
                                                        className="w-full py-3.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Initialize Data Wipe
                                                    </Motion.button>
                                                ) : (
                                                    <Motion.div
                                                        key="confirm"
                                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                        className="space-y-4"
                                                    >
                                                        <div>
                                                            <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-2">
                                                                Type <span className="font-mono bg-red-500/20 px-1 py-0.5 rounded">"delete"</span> to confirm
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={wipeConfirmText}
                                                                onChange={e => setWipeConfirmText(e.target.value)}
                                                                placeholder="Type delete here…"
                                                                className="w-full bg-black/60 border border-red-900/40 rounded-xl px-4 py-3 text-sm text-red-300 placeholder-red-900 focus:outline-none focus:border-red-500/60 transition-all font-mono"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button onClick={() => { setShowWipe(false); setWipeConfirmText(''); }} className="py-3 rounded-xl bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                                                            <button
                                                                onClick={handleWipe}
                                                                disabled={wiping || wipeConfirmText.trim().toLowerCase() !== 'delete'}
                                                                className="py-3 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                            >
                                                                {wiping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                                {wiping ? 'Wiping…' : 'Confirm Wipe'}
                                                            </button>
                                                        </div>
                                                    </Motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </Motion.div>
                    </AnimatePresence>

                    {/* ── Footer status bar ── */}
                    <div className="flex items-center justify-center gap-4 pt-4 opacity-25 hover:opacity-60 transition-opacity duration-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/60">System Operational</span>
                        <div className="w-px h-3 bg-white/20" />
                        <span className="text-[10px] font-mono text-white/40">Cashly v2.0</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
