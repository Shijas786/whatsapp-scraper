'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download, UserPlus, Save, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export function GroupScraper({ fetchGroups, fetchParticipants, onContactsScraped, onSaveToDashboard }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        setLoading(true);
        try {
            const data = await fetchGroups();
            setGroups(data);
        } catch (error) {
            console.error('Error loading groups:', error);
        }
        setLoading(false);
    };

    const handleScrape = async (group) => {
        setSelectedGroup(group.id);
        setLoading(true);
        try {
            const participants = await fetchParticipants(group.id);
            // Add group name to each participant for better tracking
            const participantsWithMeta = participants.map(p => ({
                ...p,
                groupName: group.name,
                groupId: group.id
            }));
            onContactsScraped(participantsWithMeta);
        } catch (error) {
            console.error('Error scraping participants:', error);
        }
        setLoading(false);
    };

    const handleSaveAll = async (group) => {
        setLoading(true);
        try {
            const participants = await fetchParticipants(group.id);
            const participantsWithMeta = participants.map(p => ({
                ...p,
                groupName: group.name,
                groupId: group.id
            }));
            await onSaveToDashboard(participantsWithMeta, 'Scraped Group');
            alert(`Successfully saved ${participants.length} contacts! ✨`);
        } catch (error) {
            console.error('Error saving participants:', error);
            alert('Failed to save contacts');
        }
        setLoading(false);
    };

    const filteredGroups = groups.filter(g => 
        g.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <section className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">Group Explorer 🔎</h2>
                    <p className="text-slate-500 font-medium">Identify and extract participants from accessible WhatsApp groups.</p>
                </div>
                <button 
                    onClick={loadGroups}
                    className="p-3 bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(30,41,59,1)] hover:rotate-12 transition-all"
                >
                    <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search your groups..." 
                    className="input-playful w-full py-4 pl-12 text-lg font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading && groups.length === 0 ? (
                    <div className="col-span-2 py-20 text-center text-slate-400 font-bold animate-pulse">
                        Loading available groups... 🚀
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="col-span-2 py-20 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-3xl">
                        No groups found matching "{searchTerm}"
                    </div>
                ) : (
                    filteredGroups.map((group) => (
                        <motion.div 
                            key={group.id} 
                            whileHover={{ y: -4 }}
                            className="playful-card p-6 bg-white flex flex-col gap-4 border-2 border-slate-900"
                        >
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-black text-lg text-slate-900 truncate">{group.name}</h4>
                                <p className="text-xs font-bold text-slate-400 truncate mt-1">{group.id}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleScrape(group)}
                                    disabled={loading && selectedGroup === group.id}
                                    className="flex-1 btn-playful justify-center text-sm"
                                >
                                    {loading && selectedGroup === group.id ? (
                                        'Scraping...'
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Scrape
                                        </>
                                    )}
                                </button>
                                <button 
                                    onClick={() => handleSaveAll(group)}
                                    disabled={loading}
                                    className="btn-playful bg-white text-slate-900 shadow-[3px_3px_0px_0px_rgba(30,41,59,1)] hover:bg-slate-50 border-2 border-slate-900 px-4"
                                >
                                    <Save className="w-5 h-5 text-primary" />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </section>
    );
}
