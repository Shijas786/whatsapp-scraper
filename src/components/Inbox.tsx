'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, MessageSquare, MoreVertical, Search, Smile, Paperclip, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/lib/config';


export function Inbox({ messages, sendMessage, initialChat = null, onChatChange = null }) {
    const [selectedChat, setSelectedChat] = useState(initialChat);
    const [newMessage, setNewMessage] = useState('');
    const [templates, setTemplates] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [activeChats, setActiveChats] = useState([]);
    const [history, setHistory] = useState({}); // { chatId: [messages] }
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingChats, setLoadingChats] = useState(true);
    const scrollRef = useRef(null);

    // Load active chats list
    const loadActiveChats = async () => {
        try {
            setLoadingChats(true);
            const res = await fetch(`${API_URL}/chats`);
            const data = await res.json();
            setActiveChats(data);
        } catch (err) {
            console.error('Failed to load active chats:', err);
        } finally {
            setLoadingChats(false);
        }
    };

    // Use a custom hook or listen to window events if possible, 
    // but for now we'll use a interval or better yet, trigger from status
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeChats.length === 0) {
                loadActiveChats();
            }
        }, 5000); // Check every 5s if empty
        return () => clearInterval(interval);
    }, [activeChats.length]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [contactsRes, templatesRes] = await Promise.all([
                    fetch(`${API_URL}/contacts`),
                    fetch(`${API_URL}/templates`)
                ]);
                setContacts(await contactsRes.json());
                setTemplates(await templatesRes.json());
            } catch (err) {
                console.error('Failed to load initial inbox data:', err);
            }
        };
        loadInitialData();
        loadActiveChats();
    }, []);

    // Load history when a chat is selected
    useEffect(() => {
        const loadHistory = async () => {
            if (!selectedChat || history[selectedChat]) return;
            try {
                setLoadingHistory(true);
                const res = await fetch(`${API_URL}/chats/${selectedChat}/messages`);
                const data = await res.json();
                setHistory(prev => ({ ...prev, [selectedChat]: data }));
            } catch (err) {
                console.error('Failed to load chat history:', err);
            } finally {
                setLoadingHistory(false);
            }
        };
        loadHistory();
    }, [selectedChat]);

    useEffect(() => {
        if (initialChat) {
            setSelectedChat(initialChat);
            if (onChatChange) onChatChange(null);
        }
    }, [initialChat]);

    const getContactName = (chatId) => {
        const chat = activeChats.find(c => c.id === chatId);
        if (chat?.name) return chat.name;
        const number = chatId.split('@')[0];
        const contact = contacts.find(c => c.number === number);
        return contact?.name || number;
    };

    // Combine history with real-time socket messages
    const currentChatMessages = (() => {
        if (!selectedChat) return [];
        const localHistory = history[selectedChat] || [];
        const liveMessages = messages.filter(m => m.from === selectedChat || m.to === selectedChat);
        
        // Merge and de-duplicate by ID
        const merged = [...localHistory, ...liveMessages];
        const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());
        return unique.sort((a, b) => a.timestamp - b.timestamp);
    })();

    // DISCOVERY: Find all chats from both live sync and local message history
    const displayChats = (() => {
        // 1. Start with chats found in local messages
        const localChatIds = Array.from(new Set(messages.map(m => m.isFromMe ? m.to : m.from)));
        const localChats = localChatIds.map(id => {
            const chatMsgs = messages.filter(m => m.from === id || m.to === id);
            const lastMsg = chatMsgs[chatMsgs.length - 1];
            return {
                id,
                name: null, // Will be resolved
                lastMessage: lastMsg,
                unreadCount: 0,
                timestamp: lastMsg?.timestamp * 1000 || 0,
                isLocal: true
            };
        });

        // 2. Merge with live activeChats from WhatsApp
        const allChatIds = new Set([...localChats.map(c => c.id), ...activeChats.map(c => c.id)]);
        
        const merged = Array.from(allChatIds).map(id => {
            const liveChat = activeChats.find(c => c.id === id);
            const localChat = localChats.find(c => c.id === id);
            
            // Priority for last message: Live > Local
            const lastMessage = liveChat?.lastMessage || localChat?.lastMessage;
            const timestamp = liveChat?.timestamp || localChat?.timestamp || 0;

            return {
                id,
                displayName: liveChat?.name || getContactName(id),
                lastMessage: lastMessage,
                unreadCount: liveChat?.unreadCount || 0,
                timestamp: timestamp
            };
        });

        return merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    })();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentChatMessages, selectedChat]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;
        const res = await sendMessage(selectedChat, newMessage, true);
        if (res.success) setNewMessage('');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
            {/* Chat List */}
            <div className="md:col-span-4 flex flex-col gap-6">
                <div className="playful-card p-6 bg-white h-full flex flex-col border-2 border-slate-900">
                    <header className="mb-6">
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                             Conversations ✨
                        </h2>
                    </header>
                    
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search chats..." 
                            className="input-playful w-full pl-10 py-2 text-sm font-bold"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                        {loadingChats ? (
                            <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
                                Loading active chats... 🚀
                            </div>
                        ) : displayChats.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-bold italic">
                                No conversations yet... 🚀
                            </div>
                        ) : (
                            displayChats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat.id)}
                                    className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all border-2 ${selectedChat === chat.id ? 'bg-primary/5 border-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-900 flex items-center justify-center font-black text-slate-400">
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className="font-black text-sm text-slate-900 truncate">{chat.displayName}</div>
                                        <div className="text-[10px] text-slate-400 font-bold truncate italic">
                                            {chat.lastMessage?.body || 'No message history'}
                                        </div>
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <div className="bg-primary text-white text-[8px] px-2 py-0.5 rounded-full font-black">
                                            {chat.unreadCount}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Window */}
            <div className="md:col-span-8">
                {selectedChat ? (
                    <div className="playful-card bg-white h-full flex flex-col overflow-hidden border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                        {/* Header */}
                        <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <User size={20} className="text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-black text-slate-900">{getContactName(selectedChat)}</div>
                                    <div className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
                                    </div>
                                </div>
                            </div>
                            <button onClick={loadActiveChats} className="p-2 text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-colors">Refresh List</button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20">
                            {loadingHistory && currentChatMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 font-bold animate-pulse italic">
                                    Fetching previous history... 🧙‍♂️
                                </div>
                            ) : currentChatMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-300 font-bold italic">
                                    Start a new conversation! ✨
                                </div>
                            ) : (
                                currentChatMessages.map((msg, idx) => (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9, x: msg.isFromMe ? 20 : -20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        key={msg.id || idx} 
                                        className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] p-4 rounded-2xl font-bold text-sm border-2 ${msg.isFromMe ? 'bg-primary text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]' : 'bg-white text-slate-800 border-slate-300'}`}>
                                            {msg.body}
                                            <div className={`text-[8px] mt-2 font-black uppercase opacity-50 ${msg.isFromMe ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-6 border-t-2 border-slate-100 bg-white">
                            <form onSubmit={handleSend} className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="relative group">
                                        <select 
                                            className="appearance-none bg-slate-50 border-2 border-slate-200 px-4 py-1.5 pr-8 rounded-full text-[10px] font-black cursor-pointer hover:border-primary transition-all"
                                            onChange={(e) => {
                                                const t = templates.find(temp => temp.id === e.target.value);
                                                if (t) setNewMessage(t.body);
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Select Formal Template...</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-slate-400" />
                                    </div>
                                    <div className="h-4 w-px bg-slate-100" />
                                    <button type="button" className="text-slate-300 hover:text-slate-600 transition-colors"><Smile size={20} /></button>
                                    <button type="button" className="text-slate-300 hover:text-slate-600 transition-colors"><Paperclip size={20} /></button>
                                </div>
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Compose a message..." 
                                        className="input-playful flex-1 py-4 text-sm" 
                                    />
                                    <button 
                                        type="submit"
                                        className="btn-playful px-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="playful-card bg-white h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[3rem]">
                        <MessageSquare size={64} className="mb-4 opacity-20" />
                        <p className="font-black text-xl italic opacity-30">Select a participant to start the conversation.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
