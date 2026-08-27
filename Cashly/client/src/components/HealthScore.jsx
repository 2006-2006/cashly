import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Activity, Zap, Shield, TrendingUp } from 'lucide-react';

const HealthScore = ({ score = 0, status = 'Unknown', components, insights = [], isExpanded, onToggle }) => {

    // Determine visuals based on score range
    const getColor = (s) => {
        if (s >= 80) return { main: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/20', gradient: ['#10b981', '#34d399'] };
        if (s >= 50) return { main: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/20', gradient: ['#f59e0b', '#fbbf24'] };
        return { main: '#ef4444', bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20', gradient: ['#ef4444', '#f87171'] };
    };

    const theme = getColor(score);
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((score / 100) * circumference);

    return (
        <Motion.div
            className={`h-full relative overflow-hidden rounded-3xl border ${theme.border} bg-[#0A0A0B]/80 backdrop-blur-xl transition-all duration-500 group cursor-pointer shadow-2xl hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onToggle}
            whileHover={{ scale: 1.01 }}
        >
            {/* Ambient Glow */}
            <div className={`absolute -top-20 -right-20 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/10 to-transparent blur-[100px] rounded-full pointer-events-none`} />
            <div className={`absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-${theme.bg}/5 to-transparent opacity-20 pointer-events-none`} />

            <div className="p-8 h-full flex flex-col relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <Activity className={`w-6 h-6 ${theme.text}`} />
                            Business Health
                        </h3>
                        <p className="text-xs text-white/40 mt-1 font-medium tracking-wide">AI-Diagnostic Score • Real-time</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${theme.border} ${theme.bg}/10 ${theme.text} shadow-lg shadow-${theme.bg}/5`}>
                        {status}
                    </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row items-center gap-10">
                    {/* Gauge Chart */}
                    <div className="relative w-52 h-52 flex-shrink-0">
                        {/* Glow Behind Gauge */}
                        <div className={`absolute inset-0 rounded-full ${theme.bg} opacity-[0.03] blur-2xl transform scale-110`} />

                        <svg className="w-full h-full -rotate-90 transform drop-shadow-2xl">
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={theme.gradient[0]} />
                                    <stop offset="100%" stopColor={theme.gradient[1]} />
                                </linearGradient>
                            </defs>
                            {/* Track */}
                            <circle
                                cx="104" cy="104" r={radius}
                                fill="transparent"
                                stroke="rgba(255,255,255,0.03)"
                                strokeWidth="16"
                                strokeLinecap="round"
                            />
                            {/* Ticks (Visual Detail) */}
                            {Array.from({ length: 40 }).map((_, i) => (
                                <line
                                    key={i}
                                    x1="104" y1="10" x2="104" y2="18"
                                    transform={`rotate(${i * 9} 104 104)`}
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="2"
                                />
                            ))}

                            {/* Progress */}
                            <Motion.circle
                                cx="104" cy="104" r={radius}
                                fill="transparent"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="16"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: offset }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{ filter: `drop-shadow(0 0 15px ${theme.main}60)` }}
                            />
                        </svg>

                        {/* Center Score */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Motion.span
                                className="text-6xl font-black text-white tracking-tighter drop-shadow-lg"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5, type: "spring" }}
                            >
                                {score}
                            </Motion.span>
                            <span className={`text-[10px] font-bold ${theme.text} uppercase tracking-[0.2em] mt-2 opacity-80`}>Score</span>
                        </div>
                    </div>

                    {/* Insights & Metrics */}
                    <div className="flex-1 w-full space-y-5">
                        {/* Top Insight */}
                        <div className="bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden group/insight">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bg}`} />
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`p-2 rounded-lg bg-black/40 border border-white/5 ${theme.text}`}>
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                                        Primary Insight
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    </h4>
                                    <p className="text-xs text-white/70 leading-relaxed font-medium">
                                        {insights[0] || "Analysis in progress..."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Stability Metric */}
                            <div className="p-4 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-3 h-3 text-indigo-400" />
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Resilience</p>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <Motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, score + 10)}%` }}
                                        className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500`}
                                    />
                                </div>
                            </div>

                            {/* Efficiency Metric */}
                            <div className="p-4 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Efficiency</p>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <Motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, score > 50 ? score - 5 : score + 20)}%` }}
                                        className={`h-full rounded-full bg-gradient-to-r ${theme.bg === 'bg-emerald-500' ? 'from-emerald-500 to-teal-400' : 'from-orange-500 to-yellow-500'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </Motion.div>
    );
};

export default HealthScore;
