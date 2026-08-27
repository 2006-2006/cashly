import React, { useState, useContext } from 'react';
import { } from 'react-router-dom';
import {
    Upload as UploadIcon,
    FileSpreadsheet,
    Check,
    AlertCircle,
    Zap,
    ShieldCheck,
    Database,
    ArrowRight,
    Camera,
    Sparkles
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import AuthContext from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

const FileUploadCard = ({ title, file, onChange, status, errorMessage, icon: _Icon, colorClass }) => {
    const Icon = _Icon;
    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="group relative p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
            {/* Background Gradient Hover Effect */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                colorClass
            )} />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl bg-white/5 border border-white/10", colorClass.replace('bg-', 'text-'))}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
                    </div>
                    {status === 'success' && <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400"><Check className="w-4 h-4" /></div>}
                    {status === 'error' && <div className="p-1 rounded-full bg-red-500/20 text-red-400"><AlertCircle className="w-4 h-4" /></div>}
                </div>

                <div className="flex-1 border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer relative group/dropzone flex flex-col items-center justify-center gap-3">
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={onChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                    />

                    <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover/dropzone:scale-110 duration-300",
                        file ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"
                    )}>
                        {file ? <Check className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-medium text-white/80 group-hover/dropzone:text-white transition-colors">
                            {file ? file.name : 'Click to Upload'}
                        </p>
                        <p className="text-xs text-white/40">
                            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Drag & drop or browse'}
                        </p>
                    </div>
                </div>

                <AnimatePresence>
                    {(status === 'success' || status === 'error') && errorMessage && (
                        <Motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={cn(
                                "mt-3 text-xs px-3 py-2 rounded-lg border",
                                status === 'success'
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}
                        >
                            {errorMessage}
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Motion.div>
    );
};

const UploadDataPage = () => {

    const { selectedBusiness, fetchBusinesses, user } = useContext(AuthContext);
    const [salesFile, setSalesFile] = useState(null);
    const [expensesFile, setExpensesFile] = useState(null);
    const [inventoryFile, setInventoryFile] = useState(null);
    const [receivablesFile, setReceivablesFile] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({});
    const [errorMessages, setErrorMessages] = useState({});
    const [notification, setNotification] = useState(null);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981']
        });
    };

    // Handle file selection
    const handleFileChange = (type, e) => {
        const file = e.target.files[0];
        if (file) {
            switch (type) {
                case 'sales': setSalesFile(file); break;
                case 'expenses': setExpensesFile(file); break;
                case 'inventory': setInventoryFile(file); break;
                case 'receivables': setReceivablesFile(file); break;
                default: break;
            }
            // Clear previous status on new selection
            setUploadStatus(prev => ({ ...prev, [type]: null }));
            setErrorMessages(prev => ({ ...prev, [type]: null }));
        }
    };

    const uploadFile = async (type, file) => {
        if (!file) return;
        const businessId = selectedBusiness?._id || selectedBusiness?.id;

        if (!businessId) {
            setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
            setErrorMessages(prev => ({ ...prev, [type]: 'No business selected' }));
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('businessId', businessId);

        try {
            const endpoint = `/upload/${type}`;
            const response = await api.post(endpoint, formData);
            setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
            setErrorMessages(prev => ({ ...prev, [type]: response.data.message }));
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            const message = error.response?.data?.message || error.message || 'Upload failed';
            setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
            setErrorMessages(prev => ({ ...prev, [type]: message }));
        }
    };

    const handleUploadAll = async () => {
        setUploading(true);
        await Promise.all([
            salesFile && uploadFile('sales', salesFile),
            expensesFile && uploadFile('expenses', expensesFile),
            inventoryFile && uploadFile('inventory', inventoryFile),
            receivablesFile && uploadFile('receivables', receivablesFile)
        ]);

        // Refresh businesses and selected business to sync stats
        if (user?.id) {
            await fetchBusinesses(user.id);
        }

        setUploading(false);
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30">
            <Sidebar />

            <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
                {/* Ambient Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px]" />
                </div>

                <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/40">
                                Data Synchronization
                            </h1>
                            <div className="flex items-center gap-2 text-white/50 text-sm">
                                <Database className="w-4 h-4" />
                                <span>Target Ledger:</span>
                                <span className="text-indigo-400 font-medium">
                                    {selectedBusiness ? selectedBusiness.name : 'No Business Selected'}
                                </span>
                            </div>
                        </div>

                        {!selectedBusiness && (
                            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>Please select or create a business first</span>
                            </div>
                        )}

                        <AnimatePresence>
                            {notification && (
                                <Motion.div
                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    className={cn(
                                        "fixed top-24 right-10 z-50 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3",
                                        notification.type === 'success'
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                            : "bg-red-500/10 border-red-500/20 text-red-400"
                                    )}
                                >
                                    {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                                    <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100"><ArrowRight className="w-4 h-4 rotate-45" /></button>
                                </Motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center gap-4">
                            <Motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={async () => {
                                    setUploading(true);
                                    try {
                                        const businessId = selectedBusiness?._id || selectedBusiness?.id;
                                        await api.post('/upload/inject-sample', { businessId });
                                        if (user?.id) await fetchBusinesses(user.id);
                                        triggerConfetti();
                                        showNotification('success', 'Realistic sample data synchronized!');
                                    } catch (e) {
                                        showNotification('error', 'Injection failed: ' + e.message);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={uploading || !selectedBusiness}
                                className="px-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 text-indigo-400 hover:bg-white/10 transition-all flex items-center gap-2 group"
                            >
                                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                <span>Load Sample Data</span>
                            </Motion.button>

                            <Motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleUploadAll}
                                disabled={uploading || (!salesFile && !expensesFile && !inventoryFile && !receivablesFile) || !selectedBusiness}
                                className={cn(
                                    "px-6 py-3 rounded-xl font-semibold flex items-center gap-3 transition-all shadow-lg",
                                    uploading || (!salesFile && !expensesFile && !inventoryFile && !receivablesFile) || !selectedBusiness
                                        ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 border border-indigo-500/50"
                                )}
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Syncing...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadIcon className="w-5 h-5" />
                                        <span>Synchronize Ledger</span>
                                    </>
                                )}
                            </Motion.button>
                        </div>
                    </div>

                    {/* Upload Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileUploadCard
                            title="Internal Sales"
                            type="sales"
                            file={salesFile}
                            onChange={(e) => handleFileChange('sales', e)}
                            status={uploadStatus.sales}
                            errorMessage={errorMessages.sales}
                            icon={Zap}
                            colorClass="bg-blue-500"
                        />
                        <FileUploadCard
                            title="Expense Distributions"
                            type="expenses"
                            file={expensesFile}
                            onChange={(e) => handleFileChange('expenses', e)}
                            status={uploadStatus.expenses}
                            errorMessage={errorMessages.expenses}
                            icon={ArrowRight}
                            colorClass="bg-red-500"
                        />
                        <FileUploadCard
                            title="Asset / Inventory"
                            type="inventory"
                            file={inventoryFile}
                            onChange={(e) => handleFileChange('inventory', e)}
                            status={uploadStatus.inventory}
                            errorMessage={errorMessages.inventory}
                            icon={Database}
                            colorClass="bg-orange-500"
                        />
                        <FileUploadCard
                            title="Receivables Ledger"
                            type="receivables"
                            file={receivablesFile}
                            onChange={(e) => handleFileChange('receivables', e)}
                            status={uploadStatus.receivables}
                            errorMessage={errorMessages.receivables}
                            icon={ShieldCheck}
                            colorClass="bg-purple-500"
                        />
                    </div>

                    {/* Structural Constraints / Info Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-2 p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Zap className="w-32 h-32 text-indigo-500" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                Strict Data Guardrails Active
                            </h3>
                            <p className="text-sm text-white/50 mb-8 font-medium">
                                To ensure 100% accurate, hallucination-free AI analysis and flawless reconciliation, your uploaded ledgers must adhere exactly to the formats below.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-2">Sales Data</div>
                                    <p className="text-sm text-white/60 leading-relaxed font-medium">Headers: <span className="text-indigo-300">Date, Amount, Description, Payment Type</span></p>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-red-400 uppercase tracking-widest border-b border-red-500/20 pb-2">Expenses</div>
                                    <p className="text-sm text-white/60 leading-relaxed font-medium">Headers: <span className="text-indigo-300">Date, Category, Amount, Description</span></p>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-orange-400 uppercase tracking-widest border-b border-orange-500/20 pb-2">Inventory</div>
                                    <p className="text-sm text-white/60 leading-relaxed font-medium">Headers: <span className="text-indigo-300">Item Name, Quantity, Unit Cost, Date</span></p>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-purple-500/20 pb-2">Receivables</div>
                                    <p className="text-sm text-white/60 leading-relaxed font-medium">Headers: <span className="text-indigo-300">Customer Name, Amount, Date</span></p>
                                </div>
                            </div>
                        </Motion.div>

                        <Motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md flex flex-col justify-center gap-4"
                        >
                            <div className="p-3 bg-indigo-600 w-fit rounded-2xl shadow-lg shadow-indigo-600/20">
                                <FileSpreadsheet className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Need a Dataset?</h3>
                            <p className="text-sm text-white/50 leading-relaxed">
                                Use our realistic <strong>Playground Data</strong> to instantly populate your dashboard and see the AI in action.
                            </p>
                            <ul className="space-y-2 text-xs text-indigo-300/60 font-medium">
                                <li className="flex items-center gap-2"><Check className="w-3 h-3" /> 30 days of Sales data</li>
                                <li className="flex items-center gap-2"><Check className="w-3 h-3" /> Monthly Expense breakdown</li>
                                <li className="flex items-center gap-2"><Check className="w-3 h-3" /> Sample Inventory & Receivables</li>
                            </ul>
                        </Motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UploadDataPage;
