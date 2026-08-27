import React from 'react';
import { Download, Activity } from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border border-white/[0.08] bg-[#020408]/90 p-2 text-xs shadow-xl backdrop-blur-md">
                <p className="text-white font-mono">{`Value: ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

function StatCard({ title, value, change, changeType, icon: _Icon, chartData }) {
    const isPositive = changeType === 'positive';
    const chartColor = isPositive ? '#34d399' : changeType === 'negative' ? '#f87171' : '#818cf8';
    const Icon = _Icon || Activity;
    
    const hasChart = chartData && chartData.length > 0;

    return (
        <div className="group rounded-2xl border border-white/[0.04] bg-white/[0.01] p-5 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{title}</h3>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-white/30 group-hover:text-white/60 transition-colors">
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-2xl font-black tracking-tight text-white">{value}</p>
                    <p className={`mt-1.5 text-[10px] font-bold tracking-wide uppercase ${isPositive ? 'text-emerald-400' : changeType === 'negative' ? 'text-rose-400' : 'text-indigo-400'}`}>
                        {change}
                    </p>
                </div>
                
                {hasChart && (
                    <div className="h-10 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <Tooltip content={<CustomTooltip />} cursor={false} />
                                <Line
                                    type="monotone"
                                    dataKey="uv"
                                    stroke={chartColor}
                                    strokeWidth={1.5}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AnalyticsDashboard({ onGenerateReport, data = [] }) {
    const handleGenerateReport = () => {
        if (onGenerateReport) {
            onGenerateReport();
        } else {
            const headers = ['Metric', 'Value', 'Context'];
            const rows = data.map(d => [d.title, d.value, d.change]);
            const csvContent = "data:text/csv;charset=utf-8,"
                + headers.join(",") + "\n"
                + rows.map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "cashly_metrics_report.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="w-full">
            <header className="flex items-center justify-between pb-5 mb-5 border-b border-white/[0.04]">
                <div>
                    <h2 className="text-lg font-black tracking-tight text-white/90">
                        Performance Metrics
                    </h2>
                    <p className="mt-1 text-[10px] uppercase tracking-widest font-bold text-white/30">
                        Real-time system coverage
                    </p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export
                </button>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {data.map((item) => (
                    <StatCard
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        change={item.change}
                        changeType={item.changeType}
                        icon={item.icon}
                        chartData={item.chartData}
                    />
                ))}
            </div>
        </div>
    );
}
