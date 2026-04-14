'use client';

import { useState } from 'react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Layout } from '@/components/Layout';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { GroupScraper } from '@/components/GroupScraper';
import { MassMessenger } from '@/components/MassMessenger';
import { Inbox } from '@/components/Inbox';
import { ContactsManager } from '@/components/ContactsManager';
import { Overview } from '@/components/Overview';
import { TemplateManager } from '@/components/TemplateManager';
import { MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
    const { 
        status, qr, isConnected, messages, 
        fetchGroups, fetchParticipants, fetchContacts, saveContacts, sendMessage,
        deleteContact, fetchStats, logout
    } = useWhatsApp();
    
    const [scrapedContacts, setScrapedContacts] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [targetChat, setTargetChat] = useState(null);

    const handleMessageContact = (number) => {
        setTargetChat(number);
        setActiveTab('inbox');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <Overview fetchStats={fetchStats} />;
            case 'scraper':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8">
                            <GroupScraper 
                                fetchGroups={fetchGroups} 
                                fetchParticipants={fetchParticipants}
                                onContactsScraped={setScrapedContacts}
                                onSaveToDashboard={saveContacts}
                                onMessageContact={handleMessageContact}
                            />
                        </div>
                        <div className="lg:col-span-4">
                            <section className="playful-card p-8 bg-white h-fit sticky top-6">
                                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🔍</span> Current Scrape
                                </h3>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                    {scrapedContacts.length === 0 ? (
                                        <p className="text-slate-400 text-sm font-medium italic">No doodles found yet. Try scraping a group!</p>
                                    ) : (
                                        scrapedContacts.map((contact, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 border-2 border-slate-900 rounded-xl text-sm flex justify-between items-center shadow-[2px_2px_0px_0px_rgba(30,41,59,1)]">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-900 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                                        {contact.profilePic ? (
                                                            <img src={contact.profilePic} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-5 h-5 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-black truncate text-xs">{contact.name || 'Anonymous'}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold">{contact.number}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {contact.isAdmin && <span className="text-[7px] text-green-700 bg-green-100 border border-green-700 px-1.5 py-0.5 rounded-full font-black uppercase">Admin</span>}
                                                    <button 
                                                        onClick={() => handleMessageContact(contact.number)}
                                                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-primary"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {scrapedContacts.length > 0 && (
                                    <div className="flex flex-col gap-3 mt-8">
                                        <button 
                                            onClick={async () => {
                                                await saveContacts(scrapedContacts, 'Scraper');
                                                alert('Contacts saved to dashboard! ✨');
                                            }}
                                            className="btn-playful w-full"
                                        >
                                            Save to DB
                                        </button>
                                        <button 
                                            onClick={() => setScrapedContacts([])}
                                            className="text-xs font-black text-red-500 hover:scale-105 transition-transform mt-4"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                );
            case 'inbox':
                return <Inbox messages={messages} sendMessage={sendMessage} initialChat={targetChat} onChatChange={setTargetChat} />;
            case 'contacts':
                return (
                    <ContactsManager 
                        fetchContacts={fetchContacts} 
                        deleteContact={deleteContact}
                        saveContacts={saveContacts}
                        onMessageContact={handleMessageContact}
                    />
                );
            case 'messenger':
                return (
                    <MassMessenger 
                        contacts={scrapedContacts}
                        sendMessage={sendMessage}
                    />
                );
            case 'templates':
                return <TemplateManager />;
            default:
                return null;
        }
    };

    return (
        <Layout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isConnected={isConnected}
            logout={logout}
        >
            <AnimatePresence mode="wait">
                {!isConnected ? (
                    <motion.div
                        key="connection"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="playful-card p-12 bg-white max-w-md">
                            <h2 className="text-3xl font-black mb-4">Link WhatsApp! 📱</h2>
                            <p className="text-slate-500 font-medium mb-10">
                                Scan the doodle code with your phone to start the magic.
                            </p>
                            {qr ? (
                                <div className="p-6 bg-white doodle-border border-slate-900 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] mx-auto w-fit">
                                    <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64" />
                                </div>
                            ) : (
                                <div className="w-64 h-64 bg-slate-100 animate-pulse doodle-border border-slate-900 mx-auto flex items-center justify-center">
                                    <span className="text-slate-400 font-bold">Drawing QR...</span>
                                </div>
                            )}
                            <div className="mt-10 flex items-center justify-center gap-2 text-sm font-bold text-slate-400">
                                <ConnectionStatus status={status} />
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderContent()}
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
