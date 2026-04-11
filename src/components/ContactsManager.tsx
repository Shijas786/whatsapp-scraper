'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, Trash2, Users, Upload, X, Check, Tag, Plus, PlusCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ContactsManager({ fetchContacts, deleteContact, saveContacts, onMessageContact }) {
    const [contacts, setContacts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [filterSource, setFilterSource] = useState('All');
    const [filterTag, setFilterTag] = useState('All');
    const fileInputRef = useRef(null);
    const [tagInput, setTagInput] = useState({ number: null, value: '' });

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const data = await fetchContacts();
            setContacts(data);
        } catch (err) {
            console.error('Failed to load contacts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (number) => {
        if (!confirm(`Are you sure you want to delete ${number}? 🗑️`)) return;
        const res = await deleteContact(number);
        if (res.success) {
            setContacts(contacts.filter(c => c.number !== number));
        }
    };

    const handleAddTag = async (number) => {
        if (!tagInput.value.trim()) return;
        try {
            const res = await fetch(`http://localhost:3001/contacts/${number}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag: tagInput.value.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setContacts(contacts.map(c => 
                    c.number === number 
                    ? { ...c, tags: [...(c.tags || []), tagInput.value.trim()] } 
                    : c
                ));
                setTagInput({ number: null, value: '' });
            }
        } catch (err) {
            console.error('Failed to add tag:', err);
        }
    };

    const handleRemoveTag = async (number, tag) => {
        try {
            const res = await fetch(`http://localhost:3001/contacts/${number}/tags/${tag}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setContacts(contacts.map(c => 
                    c.number === number 
                    ? { ...c, tags: (c.tags || []).filter(t => t !== tag) } 
                    : c
                ));
            }
        } catch (err) {
            console.error('Failed to remove tag:', err);
        }
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const importedContacts = [];
            
            lines.forEach((line, index) => {
                if (index === 0) return;
                const parts = line.split(',');
                const number = parts[0]?.trim();
                const name = parts[1]?.trim();
                if (number && /^\d+$/.test(number.replace(/\D/g,''))) {
                    importedContacts.push({ 
                        number: number.replace(/\D/g,''), 
                        name: name || 'Anonymous Contact',
                        groupName: 'Import' 
                    });
                }
            });

            if (importedContacts.length > 0) {
                const res = await saveContacts(importedContacts, 'Import');
                alert(`Successfully imported ${res.count} contacts! ✨`);
                loadContacts();
            } else {
                alert('No valid contacts found in file. 🤷‍♂️');
            }
        };
        reader.readAsText(file);
    };

    const filteredContacts = contacts.filter(c => {
        const matchesSearch = 
            (c.number && c.number.includes(search)) || 
            (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
            (c.groupName && c.groupName.toLowerCase().includes(search.toLowerCase())) ||
            (c.tags && c.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
        const matchesSource = filterSource === 'All' || c.groupName === filterSource;
        const matchesTag = filterTag === 'All' || (c.tags && c.tags.includes(filterTag));
        return matchesSearch && matchesSource && matchesTag;
    });

    const sources = ['All', ...Array.from(new Set(contacts.map(c => c.groupName).filter(Boolean)))];
    const allTags = ['All', ...Array.from(new Set(contacts.flatMap(c => c.tags || [])))];

    const exportToCSV = () => {
        const headers = ['Name', 'Number', 'Group', 'Tags', 'Added At'];
        const rows = filteredContacts.map(c => [c.name || 'Anonymous Contact', c.number, c.groupName || 'Direct', (c.tags || []).join(';'), c.addedAt]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wa-contacts-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading && contacts.length === 0) {
        return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">Loading Contact Database... 🚀</div>;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        Master Dashboard
                    </h2>
                    <p className="text-slate-500 font-medium tracking-tight">Enterprise Contact Management. Integrated with Scraper by HighP.</p>
                </div>
                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".csv" />
                    <button onClick={() => fileInputRef.current.click()} className="btn-playful bg-white text-slate-900 shadow-[3px_3px_0px_0px_rgba(30,41,59,1)] hover:bg-slate-50 border-2 border-slate-900">
                        <Upload className="w-4 h-4" /> Import
                    </button>
                    <button onClick={exportToCSV} className="btn-playful">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Snap search names, numbers, or tags..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-playful w-full pl-12 py-3 text-lg font-medium"
                    />
                </div>
                <div className="md:col-span-3 relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value)}
                        className="input-playful w-full pl-10 py-3 appearance-none font-bold text-sm h-full"
                    >
                        {sources.map(s => <option key={s} value={s}>Source: {s}</option>)}
                    </select>
                </div>
                <div className="md:col-span-3 relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        className="input-playful w-full pl-10 py-3 appearance-none font-bold text-sm h-full"
                    >
                        {allTags.map(t => <option key={t} value={t}>Tag: {t}</option>)}
                    </select>
                </div>
            </div>

            <div className="playful-card overflow-hidden bg-white border-2 border-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-900">
                                <th className="px-8 py-5 text-sm font-black uppercase text-slate-500 w-16 text-center">DP</th>
                                <th className="px-8 py-5 text-sm font-black uppercase text-slate-500">Full Name</th>
                                <th className="px-8 py-5 text-sm font-black uppercase text-slate-500">Number</th>
                                <th className="px-8 py-5 text-sm font-black uppercase text-slate-500">Source</th>
                                <th className="px-8 py-5 text-sm font-black uppercase text-slate-500">Tags</th>
                                <th className="px-8 py-5 text-sm font-black uppercase text-slate-500 text-right">Magic</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-50">
                            {filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic">
                                        Oops! No records found in the current filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredContacts.map((contact, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                {contact.profilePic ? (
                                                    <img src={contact.profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-slate-300" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-black text-slate-900 text-lg">
                                                {contact.name || 'Anonymous Contact'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 font-bold text-slate-400">
                                            {contact.number}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-black doodle-border border-yellow-800">
                                                {contact.groupName || 'Direct'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {contact.tags?.map(tag => (
                                                    <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black doodle-border border-primary">
                                                        {tag}
                                                        <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveTag(contact.number, tag)} />
                                                    </span>
                                                ))}
                                                {tagInput.number === contact.number ? (
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            autoFocus
                                                            className="text-[10px] font-bold border-b-2 border-primary outline-none w-20 bg-transparent"
                                                            value={tagInput.value}
                                                            onChange={(e) => setTagInput({ ...tagInput, value: e.target.value })}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag(contact.number)}
                                                            onBlur={() => setTagInput({ number: null, value: '' })}
                                                        />
                                                        <Check size={12} className="text-green-500 cursor-pointer" onMouseDown={() => handleAddTag(contact.number)} />
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => setTagInput({ number: contact.number, value: '' })}
                                                        className="p-1 text-slate-200 hover:text-primary transition-colors"
                                                    >
                                                        <PlusCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => onMessageContact(contact.number)}
                                                    className="p-3 text-slate-300 hover:text-primary hover:rotate-12 transition-all"
                                                    title="Send Magic Message"
                                                >
                                                    <MessageSquare className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(contact.number)}
                                                    className="p-3 text-slate-300 hover:text-red-500 hover:-rotate-12 transition-all"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="flex justify-between items-center px-4">
                <div className="text-sm font-bold text-slate-400 italic">
                    Showing {filteredContacts.length} records
                </div>
                <div className="text-sm font-black text-primary">
                    Total: {contacts.length} synced
                </div>
            </div>
        </motion.div>
    );
}
