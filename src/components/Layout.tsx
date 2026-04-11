'use client';

import { Users, Send, Settings, ShieldCheck, Activity, MessageSquare, Database, LayoutDashboard } from 'lucide-react';

export function Layout({ children, activeTab, setActiveTab, isConnected }) {
    return (
        <div className="min-h-screen bg-[#fdfdfd] flex text-slate-800">
            {/* Sidebar */}
            <aside className="w-72 border-r-2 border-slate-900 p-8 flex flex-col gap-2 bg-white relative overflow-hidden">
                {/* Playful background doodles placeholder could go here */}
                
                <div className="flex items-center gap-4 mb-12 px-2">
                    <div className="w-12 h-12 bg-[#25d366] doodle-border flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Activity className="text-white w-6 h-6" />
                    </div>
                    <span className="font-black text-2xl tracking-tight text-slate-900">Scraper by HighP</span>
                </div>

                <nav className="flex-1 space-y-3">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`w-full nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('scraper')}
                        className={`w-full nav-link ${activeTab === 'scraper' ? 'active' : ''} ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!isConnected}
                    >
                        <Users className="w-5 h-5" />
                        Group Scraper
                    </button>
                    <button 
                        onClick={() => setActiveTab('inbox')}
                        className={`w-full nav-link ${activeTab === 'inbox' ? 'active' : ''} ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!isConnected}
                    >
                        <MessageSquare className="w-5 h-5" />
                        Inbox
                    </button>
                    <button 
                        onClick={() => setActiveTab('contacts')}
                        className={`w-full nav-link ${activeTab === 'contacts' ? 'active' : ''} ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!isConnected}
                    >
                        <Database className="w-5 h-5" />
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('messenger')}
                        className={`w-full nav-link ${activeTab === 'messenger' ? 'active' : ''} ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!isConnected}
                    >
                        <Send className="w-5 h-5" />
                        Mass Messenger
                    </button>
                    <button 
                        onClick={() => setActiveTab('templates')}
                        className={`w-full nav-link ${activeTab === 'templates' ? 'active' : ''}`}
                    >
                        <Database className="w-5 h-5" />
                        Templates
                    </button>
                </nav>

                <div className="mt-auto pt-8 border-t-2 border-slate-100 space-y-4">
                    <button className="w-full nav-link hover:bg-slate-50 transition-colors">
                        <Settings className="w-5 h-5" />
                        Settings
                    </button>
                    <div className="p-5 bg-yellow-50 doodle-border border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            Safety Active
                        </div>
                        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                            Don't worry! Randomized delays are active to keep your account safe.
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50/50">
                <div className="p-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
