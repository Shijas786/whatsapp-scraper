'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Play, Pause, MessageSquare, Timer, Target, Paperclip, FileText, ChevronDown, X, Users, Filter, Search, CheckCircle2, AlertCircle, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/lib/config';


export function MassMessenger({ contacts: initialContacts = [], sendMessage }) {
    const [step, setStep] = useState(1); // 1: Audience, 2: Compose, 3: Blast
    const [allContacts, setAllContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    
    // Audience state
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('All');
    const [filterTag, setFilterTag] = useState('All');
    const [selectedNumbers, setSelectedNumbers] = useState(new Set(initialContacts.map(c => c.number)));
    
    // Compose state
    const [message, setMessage] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Blast state
    const [status, setStatus] = useState('idle');
    const [results, setResults] = useState({ sent: 0, failed: 0, skipped: 0 });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextDelay, setNextDelay] = useState(0);
    const [batchSize, setBatchSize] = useState(100);
    const timerRef = useRef(null);

    // Timing preset system
    const TIMING_PRESETS = [
        { id: 'ultra_safe',  label: 'Ultra Safe',  icon: '🛡️',  desc: '45–90 min per msg', min: 2700, max: 5400,  color: 'bg-emerald-100 border-emerald-500 text-emerald-800' },
        { id: 'safe',        label: 'Safe',         icon: '✅',  desc: '10–20 min per msg', min: 600,  max: 1200, color: 'bg-green-100 border-green-500 text-green-800' },
        { id: 'moderate',    label: 'Moderate',     icon: '⚡',  desc: '2–5 min per msg',   min: 120,  max: 300,  color: 'bg-yellow-100 border-yellow-500 text-yellow-800' },
        { id: 'fast',        label: 'Fast',         icon: '🚀',  desc: '30–60s per msg',    min: 30,   max: 60,   color: 'bg-orange-100 border-orange-500 text-orange-800' },
        { id: 'custom',      label: 'Custom',       icon: '🎛️', desc: 'Set your own range', min: null, max: null, color: 'bg-slate-100 border-slate-500 text-slate-800' },
    ];
    const [selectedPreset, setSelectedPreset] = useState('safe');
    const [customMin, setCustomMin] = useState(60);
    const [customMax, setCustomMax] = useState(120);

    const getDelayRange = () => {
        if (selectedPreset === 'custom') return { min: customMin, max: customMax };
        const preset = TIMING_PRESETS.find(p => p.id === selectedPreset);
        return { min: preset.min, max: preset.max };
    };

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            try {
                const [cRes, tRes] = await Promise.all([
                    fetch(`${API_URL}/contacts`),
                    fetch(`${API_URL}/templates`)
                ]);
                const cData = await cRes.json();
                const tData = await tRes.json();
                setAllContacts(cData);
                setTemplates(tData);
            } catch (err) {
                console.error('Failed to load mass messenger data:', err);
            } finally {
                setLoadingContacts(false);
            }
        };
        loadData();
    }, []);

    // Filtering logic
    const filteredContacts = useMemo(() => {
        return allContacts.filter(c => {
            const matchesSearch = 
                (c.number && c.number.includes(search)) || 
                (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
                (c.groupName && c.groupName.toLowerCase().includes(search.toLowerCase())) ||
                (c.tags && c.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
            const matchesSource = filterSource === 'All' || c.groupName === filterSource;
            const matchesTag = filterTag === 'All' || (c.tags && c.tags.includes(filterTag));
            return matchesSearch && matchesSource && matchesTag;
        });
    }, [allContacts, search, filterSource, filterTag]);

    const sources = ['All', ...Array.from(new Set(allContacts.map(c => c.groupName).filter(Boolean)))];
    const allTags = ['All', ...Array.from(new Set(allContacts.flatMap(c => c.tags || [])))];

    const toggleSelect = (number) => {
        const newSet = new Set(selectedNumbers);
        if (newSet.has(number)) newSet.delete(number);
        else newSet.add(number);
        setSelectedNumbers(newSet);
    };

    const selectAllFiltered = () => {
        const newSet = new Set(selectedNumbers);
        filteredContacts.forEach(c => newSet.add(c.number));
        setSelectedNumbers(newSet);
    };

    const deselectAllFiltered = () => {
        const newSet = new Set(selectedNumbers);
        filteredContacts.forEach(c => newSet.delete(c.number));
        setSelectedNumbers(newSet);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            setSelectedMedia(data);
        } catch (err) {
            alert('Upload failed! 🤷‍♂️');
        } finally {
            setIsUploading(false);
        }
    };

    const startMessaging = () => {
        if (selectedNumbers.size === 0) return alert('No audience selected! 🎯');
        setStatus('sending');
        setStep(3);
    };

    // Sending loop
    useEffect(() => {
        if (status === 'sending') {
            const numbers = Array.from(selectedNumbers);
            if (currentIndex >= numbers.length || currentIndex >= batchSize) {
                setStatus('completed');
                return;
            }

            const sendNext = async () => {
                const number = numbers[currentIndex];
                try {
                    const res = await sendMessage(number, message, false, selectedMedia?.path);
                    if (res.skipped) setResults(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                    else if (res.success) setResults(prev => ({ ...prev, sent: prev.sent + 1 }));
                    else setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
                } catch (error) {
                    setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
                }

                const nextIdx = currentIndex + 1;
                if (nextIdx < numbers.length && nextIdx < batchSize) {
                    const { min, max } = getDelayRange();
                    const actualDelay = min + Math.random() * (max - min);
                    setNextDelay(Math.round(actualDelay));
                    timerRef.current = setTimeout(() => setCurrentIndex(nextIdx), actualDelay * 1000);
                } else {
                    setStatus('completed');
                }
            };
            sendNext();
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [status, currentIndex]);

    const progress = selectedNumbers.size > 0 ? Math.round((currentIndex / Math.min(selectedNumbers.size, batchSize)) * 100) : 0;

    if (loadingContacts) return <div className="p-20 text-center font-black animate-pulse text-slate-400">Preparing HighP Audience...</div>;

    const getContactByNumber = (number) => allContacts.find(c => c.number === number);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Send className="w-8 h-8 text-primary" />
                        Campaign Suite 🚀
                    </h2>
                    <p className="text-slate-500 font-medium tracking-tight">Structured Campaign Management by HighP.</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${step === s ? 'bg-primary text-white shadow-inner' : 'text-slate-400 opacity-50'}`}>
                            <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[8px]">{s}</span>
                            {s === 1 ? 'Audience' : s === 2 ? 'Compose' : 'Blast'}
                        </div>
                    ))}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {/* STEP 1: AUDIENCE SELECTION */}
                {step === 1 && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-8 flex flex-col gap-6">
                                <div className="playful-card p-6 bg-white space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input type="text" placeholder="Search by name or number..." className="input-playful w-full pl-11 py-2" value={search} onChange={e => setSearch(e.target.value)} />
                                        </div>
                                        <div className="flex gap-2">
                                            <select className="input-playful flex-1 py-2 appearance-none text-xs h-full" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                                                {sources.map(s => <option key={s} value={s}>Source: {s}</option>)}
                                            </select>
                                            <select className="input-playful flex-1 py-2 appearance-none text-xs h-full" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
                                                {allTags.map(t => <option key={t} value={t}>Tag: {t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center px-2">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredContacts.length} found</div>
                                        <div className="flex gap-2">
                                            <button onClick={selectAllFiltered} className="text-[10px] font-black text-primary hover:underline">Select All</button>
                                            <button onClick={deselectAllFiltered} className="text-[10px] font-black text-red-500 hover:underline">Deselect All</button>
                                        </div>
                                    </div>

                                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 border-2 border-slate-50 rounded-2xl p-4 bg-slate-50/30">
                                        {filteredContacts.map(c => (
                                            <div key={c.number} className="flex items-center gap-4 p-3 bg-white rounded-xl border-2 border-slate-100 hover:border-primary/50 transition-colors group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedNumbers.has(c.number)} 
                                                    onChange={() => toggleSelect(c.number)}
                                                    className="w-5 h-5 rounded-lg border-2 border-slate-900 checked:bg-primary appearance-none cursor-pointer transition-all"
                                                />
                                                <div className="flex-1 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-slate-900 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                                            {c.profilePic ? (
                                                                <img src={c.profilePic} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-sm text-slate-900">{c.name || 'Anonymous'}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">
                                                                <span>{c.number}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 flex gap-2">
                                                        <span>{c.groupName || 'Direct'}</span>
                                                        {c.tags?.map(t => <span key={t} className="text-primary">#{t}</span>)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-4 space-y-6">
                                <div className="playful-card p-8 bg-slate-900 text-white flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center border-2 border-white mb-6 rotate-3">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <div className="text-3xl font-black mb-1">{selectedNumbers.size}</div>
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Audience</div>
                                    <button 
                                        onClick={() => setStep(2)}
                                        disabled={selectedNumbers.size === 0}
                                        className="btn-playful w-full mt-8 disabled:opacity-50"
                                    >
                                        Next: Compose <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: COMPOSE & SETTINGS */}
                {step === 2 && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 space-y-6">
                                <div className="playful-card p-8 bg-white">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-black flex items-center gap-2">
                                            <MessageSquare className="text-primary" /> Campaign Content
                                        </h3>
                                        <select 
                                            className="appearance-none bg-slate-50 border-2 border-slate-900 px-4 py-2 pr-10 rounded-xl text-[10px] font-black cursor-pointer hover:bg-slate-100 transition-colors"
                                            onChange={(e) => {
                                                const t = templates.find(temp => temp.id === e.target.value);
                                                if (t) setMessage(t.body);
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Load Campaign Template...</option>
                                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="relative">
                                        <textarea 
                                            value={message} onChange={e => setMessage(e.target.value)}
                                            placeholder="Compose your formal campaign message... Use {number} to personalize!"
                                            className="input-playful w-full h-48 resize-none text-lg font-medium p-8"
                                        />
                                        <div className="absolute bottom-6 right-6 flex gap-3">
                                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${selectedMedia ? 'bg-primary text-white' : 'bg-white text-slate-900 hover:rotate-6'}`}
                                            >
                                                {isUploading ? <Timer className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedMedia && (
                                        <div className="mt-6 p-4 bg-slate-50 border-2 border-slate-900 rounded-3xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                                                    <FileText className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="text-sm font-black truncate max-w-[300px]">{selectedMedia.name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400">Resource Synchronized</div>
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedMedia(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <div className="playful-card p-8 bg-white border-2 border-slate-900 h-full">
                                    <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                                        <Timer className="text-primary" /> Dispatch Settings
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Timing Preset Grid */}
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Send Interval (Anti-Ban)</label>
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                {TIMING_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => setSelectedPreset(preset.id)}
                                                        className={`p-3 rounded-xl border-2 text-left transition-all ${selectedPreset === preset.id ? preset.color + ' shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-slate-200 hover:border-slate-400'}`}
                                                    >
                                                        <div className="text-base mb-1">{preset.icon}</div>
                                                        <div className="text-[11px] font-black text-slate-900">{preset.label}</div>
                                                        <div className="text-[9px] font-bold text-slate-500 mt-0.5">{preset.desc}</div>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Custom Range UI */}
                                            {selectedPreset === 'custom' && (
                                                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Min Delay (seconds)</label>
                                                        <input
                                                            type="number"
                                                            value={customMin}
                                                            onChange={e => setCustomMin(Math.max(10, parseInt(e.target.value) || 10))}
                                                            className="input-playful w-full py-2 text-sm font-bold"
                                                            min="10"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Max Delay (seconds)</label>
                                                        <input
                                                            type="number"
                                                            value={customMax}
                                                            onChange={e => setCustomMax(Math.max(customMin + 10, parseInt(e.target.value) || 120))}
                                                            className="input-playful w-full py-2 text-sm font-bold"
                                                            min={customMin + 10}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 italic font-bold">Each message will wait a random amount between these two values.</p>
                                                </div>
                                            )}

                                            {/* Risk Indicator */}
                                            {selectedPreset !== 'custom' && (
                                                <div className={`text-[9px] font-black px-3 py-2 rounded-lg border-2 ${ 
                                                    selectedPreset === 'ultra_safe' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                    selectedPreset === 'safe' ? 'bg-green-50 border-green-200 text-green-700' :
                                                    selectedPreset === 'moderate' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                    'bg-red-50 border-red-200 text-red-700'
                                                }`}>
                                                    {selectedPreset === 'ultra_safe' && '🛡️ Lowest ban risk. Best for large campaigns.'}
                                                    {selectedPreset === 'safe' && '✅ Recommended for most campaigns.'}
                                                    {selectedPreset === 'moderate' && '⚠️ Moderate risk. Use with small lists only.'}
                                                    {selectedPreset === 'fast' && '🔴 High risk! Only use for testing with 5-10 numbers.'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Batch Size */}
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Batch Size Limit</label>
                                            <input type="number" value={batchSize} onChange={e => setBatchSize(parseInt(e.target.value) || 1)} className="input-playful w-full py-3 text-sm font-bold" />
                                            <p className="text-[10px] text-slate-400 font-bold mt-2 italic">Stop after sending to this many contacts.</p>
                                        </div>

                                        <div className="pt-4 flex gap-4">
                                            <button onClick={() => setStep(1)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-900 flex items-center justify-center gap-2">
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                            <button onClick={startMessaging} className="btn-playful flex-[2]">
                                                Launch Campaign! 🚀
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: BLAST DASHBOARD */}
                {step === 3 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 space-y-6">
                                <div className="playful-card p-10 bg-white border-primary">
                                    <div className="flex justify-between items-end mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900">Campaign Execution...</h3>
                                            <p className="text-slate-500 font-medium">{currentIndex} of {Math.min(selectedNumbers.size, batchSize)} dispatched</p>
                                        </div>
                                        <div className="text-4xl font-black text-primary">{progress}%</div>
                                    </div>
                                    
                                    <div className="w-full h-8 bg-slate-100 border-2 border-slate-900 rounded-full overflow-hidden p-2 shadow-inner mb-10">
                                        <motion.div 
                                            className="h-full bg-primary rounded-full relative"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/30 animate-pulse" />
                                        </motion.div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-50 pb-2">Recent Dispatches</h4>
                                        <div className="space-y-3">
                                            {currentIndex === 0 && status === 'sending' && <div className="text-slate-400 italic">Wait for it... ✨</div>}
                                            {status === 'completed' && <div className="flex items-center gap-2 text-green-600 font-black"><CheckCircle2 className="w-5 h-5" /> Campaign successfully delivered.</div>}
                                        </div>
                                    </div>

                                    <div className="mt-10 flex gap-4">
                                        {status === 'sending' ? (
                                            <button onClick={() => setStatus('paused')} className="btn-playful bg-yellow-400 border-slate-900 px-10">
                                                <Pause className="w-5 h-5" /> Pause Dispatch
                                            </button>
                                        ) : status === 'paused' ? (
                                            <button onClick={() => setStatus('sending')} className="btn-playful px-10">
                                                <Play className="w-5 h-5" /> Resume Dispatch
                                            </button>
                                        ) : (
                                            <button onClick={() => setStep(1)} className="btn-playful px-10">
                                                Finish & Exit
                                            </button>
                                        )}
                                        {status === 'sending' && (
                                            <div className="flex-1 flex items-center justify-end gap-3 text-slate-400 font-black italic">
                                                Next Dispatch in {nextDelay}s <Timer className="w-5 h-5 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-4">
                                <section className="playful-card p-8 bg-white h-full">
                                    <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                                        <Target className="text-primary w-6 h-6" /> Batch Live Stats
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center pb-4 border-b-2 border-slate-50">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Total Targeted</span>
                                            <span className="font-black text-2xl">{Math.min(selectedNumbers.size, batchSize)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b-2 border-slate-50 text-green-600">
                                            <span className="text-green-600/50 font-bold uppercase text-[10px]">Successfully Sent</span>
                                            <span className="font-black text-2xl">{results.sent}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b-2 border-slate-50 text-blue-500">
                                            <span className="text-blue-500/50 font-bold uppercase text-[10px]">Skipped</span>
                                            <span className="font-black text-2xl">{results.skipped}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-red-500">
                                            <span className="text-red-500/30 font-bold uppercase text-[10px]">Failed</span>
                                            <span className="font-black text-2xl">{results.failed}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
