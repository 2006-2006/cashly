import React, { useState, useEffect, useContext } from 'react';
import { Lock, Delete, ShieldCheck, Cpu, Fingerprint, Scan, ShieldAlert, Sparkles, Wand2, Terminal, Orbit } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../contexts/AuthContext';

const SESSION_UNLOCKED_KEY = 'cashly_session_unlocked';

const AppLock = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [isLocked, setIsLocked] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const getLockKeys = () => {
        if (!user?.id) return { enabled: null, pin: null };
        return {
            enabled: `cashly_lock_enabled_${user.id}`,
            pin: `cashly_lock_pin_${user.id}`
        };
    };

    useEffect(() => {
        const checkLockStatus = () => {
            if (!user) {
                setIsLocked(false);
                return;
            }
            const keys = getLockKeys();
            if (!keys.enabled) return;

            const enabled = localStorage.getItem(keys.enabled) === 'true';
            const unlocked = sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';

            if (enabled && !unlocked) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        };

        checkLockStatus();
    }, [user]);

    const handleUnlock = async (currentPin) => {
        setVerifying(true);
        const keys = getLockKeys();
        const storedPin = localStorage.getItem(keys.pin);

        // High-end verification latency
        await new Promise(resolve => setTimeout(resolve, 800));

        if (currentPin === storedPin) {
            setError(false);
            setPin('');
            sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
            setVerifying(false);
            setIsLocked(false);
        } else {
            setError(true);
            setPin('');
            setVerifying(false);
            setTimeout(() => setError(false), 2000);
        }
    };

    const onNumberClick = (num) => {
        if (pin.length < 4 && !verifying) {
            const nextPin = pin + num;
            setPin(nextPin);
            if (nextPin.length === 4) {
                handleUnlock(nextPin);
            }
        }
    };

    if (!isLocked) return <>{children}</>;

    const numpadEntries = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <AnimatePresence>
            <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                className="fixed inset-0 z-[999999] bg-[#02040a] text-white flex flex-col items-center justify-center font-sans overflow-hidden select-none"
            >
                {/* Advanced Neural Background with "Matrix" subtle drift */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '30px 30px' }} />

                    <Motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.1, 0.15, 0.1],
                            x: [-20, 20, -20],
                            y: [-20, 20, -20]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1400px] bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 blur-[120px] rounded-full"
                    />

                    {/* Laser Scan Effect */}
                    <Motion.div
                        animate={{ left: ['-100%', '200%'] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-0 bottom-0 w-[2px] bg-indigo-500/20 blur-[4px] rotate-12 z-0"
                    />
                </div>

                <div className="relative z-10 w-full max-w-sm flex flex-col items-center px-6 md:px-8 overflow-y-auto no-scrollbar max-h-screen py-8">
                    {/* Identity Processor Hub - Optimized for mobile */}
                    <div className="relative mb-8 md:mb-14 shrink-0">
                        <Motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                            className="absolute -inset-6 md:-inset-10 border border-white/5 rounded-full pointer-events-none opacity-20"
                        />

                        <Motion.div
                            animate={error ? { x: [-10, 10, -10, 10, 0] } : verifying ? { scale: [1, 1.1, 1] } : {}}
                            className={`relative p-6 md:p-9 rounded-[2.5rem] md:rounded-[3.5rem] backdrop-blur-3xl border transition-all duration-700
                                ${error ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_80px_rgba(239,68,68,0.3)]' :
                                    verifying ? 'border-indigo-400/50 bg-indigo-500/10 shadow-[0_0_80px_rgba(99,102,241,0.3)]' :
                                        'border-white/10 bg-white/5 shadow-2xl'}
                            `}
                        >
                            <AnimatePresence mode="wait">
                                {verifying ? (
                                    <Motion.div key="scan" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                                        <Orbit className="w-10 h-10 md:w-14 md:h-14 text-indigo-400 animate-spin" />
                                    </Motion.div>
                                ) : error ? (
                                    <Motion.div key="alert" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                                        <ShieldAlert className="w-10 h-10 md:w-14 md:h-14 text-red-500" />
                                    </Motion.div>
                                ) : (
                                    <Motion.div key="lock" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                                        <Terminal className="w-10 h-10 md:w-14 md:h-14 text-white/90" />
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </Motion.div>
                    </div>

                    {/* Command Console Text */}
                    <div className="text-center space-y-2 md:space-y-3 mb-8 md:mb-12 shrink-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-indigo-300">Identity Shield Active</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                            SECURE_NODE
                        </h2>
                        <p className="text-[9px] md:text-[10px] font-mono text-white/30 uppercase tracking-[0.4em]">Post-Auth Verification Required</p>
                    </div>

                    {/* Advanced PIN Segments - Scaled for Mobile */}
                    <div className="flex justify-center gap-3 md:gap-4 mb-10 md:mb-14 shrink-0">
                        {[0, 1, 2, 3].map((i) => (
                            <Motion.div
                                key={i}
                                animate={{
                                    scale: pin.length > i ? 1.05 : 1,
                                    borderColor: error ? 'rgba(239, 68, 68, 0.4)' : (pin.length > i ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.05)'),
                                    backgroundColor: pin.length > i ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)'
                                }}
                                className={`w-12 h-16 md:w-14 md:h-18 rounded-xl md:rounded-2xl border transition-all duration-300 flex items-center justify-center`}
                            >
                                <AnimatePresence mode="wait">
                                    {pin.length > i ? (
                                        <Motion.div
                                            key="char"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`text-lg md:text-xl font-black ${error ? 'text-red-500' : 'text-indigo-400'}`}
                                        >
                                            *
                                        </Motion.div>
                                    ) : (
                                        <Motion.div
                                            key="cursor"
                                            animate={{ opacity: pin.length === i ? [0.1, 0.3, 0.1] : 0.05 }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                            className="w-3 md:w-4 h-0.5 bg-white rounded-full"
                                        />
                                    )}
                                </AnimatePresence>
                            </Motion.div>
                        ))}
                    </div>

                    {/* Tech Keypad - Better gap for mobile */}
                    <div className="grid grid-cols-3 gap-3 md:gap-6 w-full max-w-[280px] md:max-w-[320px] shrink-0">
                        {numpadEntries.map((num) => (
                            <TechButton key={num} label={num} onClick={() => onNumberClick(num)} disabled={verifying} />
                        ))}
                        <div className="w-full h-12 md:h-16" />
                        <TechButton label={0} onClick={() => onNumberClick(0)} disabled={verifying} />
                        <button
                            onClick={() => setPin(prev => prev.slice(0, -1))}
                            disabled={verifying}
                            className="h-12 md:h-16 w-full rounded-2xl md:rounded-3xl border border-white/5 hover:border-red-500/20 hover:bg-red-500/5 transition-all flex items-center justify-center active:scale-90 disabled:opacity-20"
                        >
                            <Delete className="w-5 h-5 md:w-6 md:h-6 text-white/30" />
                        </button>
                    </div>

                    {/* Operational Telemetry - Hidden on extra small height */}
                    <div className="mt-12 md:mt-16 w-full hidden sm:flex items-center justify-center gap-6 md:gap-10 opacity-30 group cursor-default shrink-0">
                        <TelemetryItem label="SYNC" value="READY" />
                        <div className="w-px h-6 md:h-8 bg-white/10" />
                        <TelemetryItem label="GATE" value="LOCKED" />
                        <div className="w-px h-6 md:h-8 bg-white/10" />
                        <TelemetryItem label="NODE" value="0XF2" />
                    </div>
                </div>

                {/* Subtle glitch overlay on error */}
                <AnimatePresence>
                    {error && (
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-red-600 mix-blend-color-dodge pointer-events-none"
                        />
                    )}
                </AnimatePresence>
            </Motion.div>
        </AnimatePresence>
    );
};

const TechButton = ({ label, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="group relative h-14 sm:h-16 w-full rounded-2xl sm:rounded-3xl overflow-hidden transition-all active:scale-95 disabled:opacity-20"
    >
        <div className="absolute inset-0 bg-white/[0.03] group-hover:bg-white/[0.08] border border-white/5 group-hover:border-white/20 transition-all" />
        <span className="relative z-10 text-xl sm:text-2xl font-black text-white/30 group-hover:text-white transition-all transform group-hover:scale-125">
            {label}
        </span>
    </button>
);

const TelemetryItem = ({ label, value }) => (
    <div className="flex flex-col items-center">
        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">{label}</span>
        <span className="text-[10px] font-bold text-white/40 font-mono">{value}</span>
    </div>
);

export default AppLock;
