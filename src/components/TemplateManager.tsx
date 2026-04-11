'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_URL } from '@/lib/config';

export function TemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ name: '', body: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/templates`);
            const data = await res.json();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to load templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentTemplate.name || !currentTemplate.body) {
            alert('Please fill in both name and content! 🖍️');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentTemplate)
            });
            await res.json();
            setIsEditing(false);
            setCurrentTemplate({ name: '', body: '' });
            loadTemplates();
        } catch (err) {
            console.error('Failed to save template:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this template? 🗑️')) return;
        try {
            await fetch(`${API_URL}/templates/${id}`, { method: 'DELETE' });
            loadTemplates();
        } catch (err) {
            console.error('Failed to delete template:', err);
        }
    };

    const startEdit = (template) => {
        setCurrentTemplate(template);
        setIsEditing(true);
    };

    if (loading && templates.length === 0) {
        return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">Drawing your templates... 🖋️</div>;
    }

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        Message Templates
                    </h2>
                    <p className="text-slate-500 font-medium">Create and manage your reusable doodles.</p>
                </div>
                {!isEditing && (
                    <button 
                        onClick={() => { setCurrentTemplate({ name: '', body: '' }); setIsEditing(true); }}
                        className="btn-playful"
                    >
                        <Plus className="w-5 h-5" /> New Template
                    </button>
                )}
            </header>

            <AnimatePresence>
                {isEditing && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="playful-card p-8 bg-white border-primary"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900">
                                {currentTemplate.id ? 'Edit Template ✏️' : 'Create Template ✨'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Template Name</label>
                                <input 
                                    type="text" 
                                    className="input-playful w-full py-3"
                                    placeholder="e.g., Welcome Message"
                                    value={currentTemplate.name}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Message Body</label>
                                <textarea 
                                    className="input-playful w-full h-40 py-4"
                                    placeholder="Type your playground message... Use {number} to personalize!"
                                    value={currentTemplate.body}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsEditing(false)} className="px-6 py-3 font-black text-slate-400 hover:text-slate-900">Cancel</button>
                                <button onClick={handleSave} className="btn-playful px-10">
                                    <Save className="w-5 h-5" /> Save Doodles
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.length === 0 && !isEditing ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-3xl opacity-50">
                        No templates found. Go create something magical! 🪄
                    </div>
                ) : (
                    templates.map((template) => (
                        <motion.div 
                            key={template.id}
                            whileHover={{ y: -4 }}
                            className="playful-card p-6 bg-white flex flex-col gap-4 border-2 border-slate-900"
                        >
                            <div className="flex-1">
                                <h4 className="font-black text-lg text-slate-900 mb-2 truncate">{template.name}</h4>
                                <p className="text-slate-500 text-sm line-clamp-3 font-medium leading-relaxed">
                                    {template.body}
                                </p>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-50">
                                <span className="text-[10px] font-black text-slate-300 uppercase">
                                    {new Date(template.updatedAt).toLocaleDateString()}
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => startEdit(template)}
                                        className="p-2 text-slate-400 hover:text-primary transition-colors hover:rotate-6"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:-rotate-6"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
