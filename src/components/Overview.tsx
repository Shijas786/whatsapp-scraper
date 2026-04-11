'use client';

import { useState, useEffect } from 'react';
import { Users, Send, Globe, Zap, ArrowUpRight, TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Overview({ fetchStats }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchStats();
                setStats(data);
            } catch (err) {
                console.error('Failed to load stats:', err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
        const interval = setInterval(loadStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (!stats) {
        return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">Initializing HighP Scraper... ⚡</div>;
    }

    return (
        <div className="space-y-10 pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Intelligence Hub 🚀</h2>
                    <p className="text-slate-500 font-medium tracking-tight">Enterprise Scraper by HighP. Comprehensive analytics at a glance.</p>
                </div>
                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-xs font-black uppercase tracking-widest border-2 border-green-700">
                    Live Updates Active
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                    title="Total Scraped" 
                    value={stats.totalContacts} 
                    icon={<Users className="w-6 h-6" />} 
                    trend="+12%"
                    color="bg-blue-500"
                />
                <KPICard 
                    title="Messages Sent" 
                    value={stats.totalMessages} 
                    icon={<Send className="w-6 h-6" />} 
                    trend="+5%"
                    color="bg-primary"
                />
                <KPICard 
                    title="Sent Today" 
                    value={stats.sentToday} 
                    icon={<Zap className="w-6 h-6" />} 
                    trend="Hot!"
                    color="bg-yellow-400"
                />
                <KPICard 
                    title="Source Groups" 
                    value={stats.uniqueGroups} 
                    icon={<Globe className="w-6 h-6" />} 
                    trend="Active"
                    color="bg-purple-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Graph */}
                <div className="lg:col-span-8">
                    <div className="playful-card p-8 bg-white border-2 border-slate-900 h-full">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black flex items-center gap-2">
                                <TrendingUp className="text-primary" /> Activity Pulse
                            </h3>
                            <div className="text-[10px] font-black text-slate-400 uppercase">Messages / Last 7 Days</div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chartData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#25d366" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#25d366" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '16px', 
                                            border: '2px solid #0f172a', 
                                            fontWeight: '900',
                                            fontSize: '12px'
                                        }} 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="#25d366" 
                                        strokeWidth={4} 
                                        fillOpacity={1} 
                                        fill="url(#colorCount)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Side Stats */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="playful-card p-8 bg-white border-2 border-slate-900">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                            <PieChartIcon className="text-blue-500" /> Top Sources
                        </h3>
                        <div className="space-y-4">
                            {stats.sourceData?.map((source, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="truncate max-w-[150px] font-bold">{source.name}</span>
                                        <span className="font-black">{source.value}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-50 border border-slate-200 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(source.value / Math.max(stats.totalContacts, 1)) * 100}%` }}
                                            className="h-full bg-primary"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="playful-card p-8 bg-slate-900 text-white shadow-[6px_6px_0px_0px_rgba(30,41,59,1)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-white text-slate-900 rounded-lg flex items-center justify-center">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black italic">Recent Magic</h3>
                        </div>
                        <div className="space-y-4">
                            {stats.recentActivity.slice(0, 3).map((act, idx) => (
                                <div key={idx} className="border-l-2 border-primary pl-4 py-1">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                        {new Date(act.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="text-sm font-bold truncate">{act.action}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, trend, color }) {
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="playful-card p-8 bg-white flex flex-col border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(30,41,59,1)]"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-4 ${color} text-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900`}>
                    {icon}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                    <ArrowUpRight className="w-3 h-3" /> {trend}
                </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</div>
        </motion.div>
    );
}
