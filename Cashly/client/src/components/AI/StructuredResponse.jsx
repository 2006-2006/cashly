import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion as Motion } from 'framer-motion';
import {
    AlertCircle, CheckCircle2, TrendingUp, TrendingDown,
    ArrowRight, Info, Zap, ShieldCheck, Target,
    BarChart3, Lightbulb, Search, Terminal
} from 'lucide-react';
import { cn } from '../../lib/utils';

const StructuredResponse = ({ content, animate = true }) => {
    const [displayedContent, setDisplayedContent] = React.useState(animate ? "" : content);

    React.useEffect(() => {
        if (!animate) {
            setDisplayedContent(content);
            return;
        }

        let i = 0;
        const speed = 2; // characters per tick
        const interval = setInterval(() => {
            setDisplayedContent(content.slice(0, i));
            i += speed;
            if (i > content.length) clearInterval(interval);
        }, 5);

        return () => clearInterval(interval);
    }, [content, animate]);

    const components = {
        p: ({ children }) => <p className="mb-4 last:mb-0 text-white/90 leading-relaxed text-base font-medium selection:bg-indigo-500/40">{children}</p>,
        h1: ({ children }) => (
            <h1 className="text-3xl font-black text-white mt-12 mb-8 tracking-tighter flex items-center gap-4 group relative">
                <div className="w-2.5 h-12 bg-gradient-to-b from-indigo-500 via-purple-600 to-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)] group-hover:scale-y-110 transition-transform duration-500" />
                <div className="absolute -top-6 left-8">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-[5px] text-[10px] font-black opacity-70">Major Insight</span>
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-100 to-white/70">{children}</span>
            </h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-xl font-bold text-white mt-10 mb-5 flex items-center gap-4 group">
                <SparkleIcon />
                <span className="tracking-tight group-hover:text-indigo-300 transition-colors">{children}</span>
            </h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-xs font-black text-indigo-400/80 mt-10 mb-4 uppercase tracking-[0.3em] flex items-center gap-4">
                <div className="w-8 h-[1px] bg-gradient-to-r from-indigo-500/50 to-transparent" />
                {children}
            </h3>
        ),
        strong: ({ children }) => (
            <strong className="font-bold text-white bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:bg-indigo-500/30 transition-colors selection:bg-indigo-400">
                {children}
            </strong>
        ),
        ul: ({ children }) => <ul className="space-y-5 my-10 list-none">{children}</ul>,
        li: ({ children }) => {
            const text = children?.toString() || '';
            let Icon = ArrowRight;
            let themeColor = "indigo";

            if (text.includes('✅') || text.includes('Success')) themeColor = "emerald";
            else if (text.includes('⚠️') || text.includes('Risk') || text.includes('Warning')) themeColor = "amber";
            else if (text.includes('🚀') || text.includes('Increase') || text.includes('Growth')) themeColor = "indigo";
            else if (text.includes('📉') || text.includes('Reduce') || text.includes('Decrease')) themeColor = "rose";
            else if (text.includes('💡') || text.includes('Idea') || text.includes('Recommend')) themeColor = "purple";
            else if (text.includes('🛡️') || text.includes('Safe') || text.includes('Shield')) themeColor = "blue";

            const themes = {
                indigo: { icon: TrendingUp, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", glow: "shadow-indigo-500/20" },
                emerald: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-emerald-500/20" },
                amber: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", glow: "shadow-amber-500/20" },
                rose: { icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "shadow-rose-500/20" },
                purple: { icon: Lightbulb, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", glow: "shadow-purple-500/20" },
                blue: { icon: ShieldCheck, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", glow: "shadow-blue-500/20" }
            };

            const t = themes[themeColor];
            const ActiveIcon = t.icon;

            return (
                <Motion.li
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                        "flex gap-6 p-6 rounded-[32px] bg-white/[0.02] border backdrop-blur-3xl transition-all group hover:bg-white/[0.05] hover:translate-x-2 border-transparent hover:border-white/10 shadow-lg",
                        t.border
                    )}
                >
                    <div className={cn(
                        "mt-0.5 p-4 rounded-2xl transition-all duration-700 group-hover:rotate-[360deg] shadow-2xl relative overflow-hidden",
                        t.bg, t.color, t.glow
                    )}>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ActiveIcon className="w-5 h-5 relative z-10" />
                    </div>
                    <div className="flex-1 text-white/90 leading-relaxed font-semibold pt-1 text-[15px]">
                        {children}
                    </div>
                </Motion.li>
            );
        },
        blockquote: ({ children }) => (
            <div className="my-12 p-10 rounded-[40px] bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-black/40 border border-white/10 relative overflow-hidden group shadow-3xl backdrop-blur-2xl">
                <div className="absolute -top-20 -right-20 p-40 opacity-5 scale-150 rotate-12 group-hover:scale-[1.8] group-hover:rotate-0 transition-all duration-1000">
                    <Zap className="w-40 h-40 text-indigo-400" />
                </div>
                <div className="relative z-10 text-white/90 flex gap-8">
                    <div className="flex-shrink-0 w-14 h-14 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/60 group-hover:scale-110 transition-transform duration-700 animate-pulse">
                        <Info className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-4 pt-1">
                        <span className="text-[11px] uppercase tracking-[5px] font-black text-indigo-400 opacity-80">Strategic Intelligence</span>
                        <div className="italic text-xl tracking-tight leading-relaxed font-medium text-white/95">{children}</div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-1000" />
            </div>
        ),
        code: ({ inline, children }) => (
            inline ? (
                <code className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-mono text-xs border border-indigo-500/20 shadow-inner hover:bg-indigo-500/20 transition-colors">
                    {children}
                </code>
            ) : (
                <div className="my-12 rounded-[32px] bg-[#030303]/90 backdrop-blur-xl border border-white/10 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] group">
                    <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.03]">
                        <div className="flex gap-2.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500/60 shadow-sm transition-colors group-hover:bg-red-500" />
                            <div className="w-3.5 h-3.5 rounded-full bg-amber-500/60 shadow-sm transition-colors group-hover:bg-amber-500" />
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/60 shadow-sm transition-colors group-hover:bg-emerald-500" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <Terminal className="w-4 h-4 text-white/20" />
                            <span className="text-[10px] text-white/20 font-mono uppercase tracking-[3px] font-black group-hover:text-white/40 transition-colors">Neural Ledger Output</span>
                        </div>
                    </div>
                    <div className="p-10 text-indigo-100 font-mono text-[13px] leading-relaxed overflow-x-auto selection:bg-indigo-500/40">
                        {children}
                    </div>
                </div>
            )
        )
    };

    return (
        <div className="structured-response-container animate-in fade-in duration-1000 relative">
            <ReactMarkdown components={components}>
                {displayedContent}
            </ReactMarkdown>
            {displayedContent.length < content.length && (
                <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse" />
            )}
            
            {/* Trust Footer */}
            {displayedContent.length === content.length && content.length > 50 && (
                <Motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mt-8 pt-4 border-t border-white/5 flex flex-wrap items-center gap-3 select-none"
                >
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Data Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <Search className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Sourced from uploads</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-white/10 text-zinc-400">
                        <Terminal className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Guardrails: Active</span>
                    </div>
                </Motion.div>
            )}
        </div>
    );
};

const SparkleIcon = () => (
    <div className="relative group">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-30 group-hover:opacity-60 transition-opacity animate-pulse" />
        <div className="relative p-2.5 bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-400 rounded-xl text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
            <Zap className="w-5 h-5 fill-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
        </div>
    </div>
);

export default React.memo(StructuredResponse);
