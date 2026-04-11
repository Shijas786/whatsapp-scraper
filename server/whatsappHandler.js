const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const storage = require('./storageHandler');
const crypto = require('crypto');
const fs = require('fs');

class WhatsAppHandler {
    constructor(io) {
        this.io = io;
        this.client = null;
        this.status = 'DISCONNECTED';
        this.qr = '';
    }

    initialize() {
        console.log('Initializing WhatsApp Client...');
        const path = require('path');
        const lockFile = path.join(process.cwd(), 'data/session/session/SingletonLock');
        
        if (fs.existsSync(lockFile)) {
            console.log('Found existing SingletonLock, removing it...');
            try {
                fs.unlinkSync(lockFile);
            } catch (err) {
                console.error('Failed to remove lock file:', err);
            }
        }

        try {
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './sessions'
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ],
                }
            });

            console.log('Client object created, setting up events...');

            // Message Listeners
            this.client.on('message', async (msg) => {
                const messageData = {
                    id: msg.id.id,
                    from: msg.from,
                    to: msg.to,
                    body: msg.body,
                    type: msg.type,
                    timestamp: msg.timestamp,
                    isFromMe: false
                };
                storage.saveMessage(messageData);
                this.io.emit('new_message', messageData);
            });

            this.client.on('message_create', async (msg) => {
                if (msg.fromMe) {
                    const messageData = {
                        id: msg.id.id,
                        from: msg.from,
                        to: msg.to,
                        body: msg.body,
                        type: msg.type,
                        timestamp: msg.timestamp,
                        isFromMe: true
                    };
                    storage.saveMessage(messageData);
                    this.io.emit('new_message', messageData);
                }
            });

            this.client.on('qr', async (qr) => {
                console.log('QR Received - Code Length:', qr.length);
                this.status = 'QR_READY';
                try {
                    const qrDataURL = await qrcode.toDataURL(qr);
                    this.qr = qrDataURL;
                    this.io.emit('status', { status: this.status, qr: this.qr });
                } catch (err) {
                    console.error('Error generating QR Data URL:', err);
                }
            });

            this.client.on('ready', () => {
                console.log('Client is ready!');
                this.status = 'CONNECTED';
                this.qr = '';
                this.io.emit('status', { status: this.status });
            });

            this.client.on('authenticated', () => {
                console.log('Authenticated successfully');
                this.status = 'AUTHENTICATED';
                this.io.emit('status', { status: this.status });
            });

            this.client.on('auth_failure', (msg) => {
                console.error('Authentication failure:', msg);
                this.status = 'DISCONNECTED';
                this.io.emit('status', { status: this.status, message: msg });
            });

            this.client.on('disconnected', (reason) => {
                console.log('Disconnected from WhatsApp:', reason);
                this.status = 'DISCONNECTED';
                this.io.emit('status', { status: this.status, message: reason });
                // Attempt re-initialization
                console.log('Attempting to re-initialize...');
                this.client.initialize().catch(err => console.error('Re-init error:', err));
            });

            console.log('Calling client.initialize()...');
            this.client.initialize().catch(err => {
                console.error('Fatal initialization error:', err);
                this.status = 'DISCONNECTED';
                this.io.emit('status', { status: this.status, error: err.message });
            });
        } catch (error) {
            console.error('Constructor error:', error);
        }
    }

    getStatus() {
        return { status: this.status, qr: this.qr };
    }

    async getGroups() {
        if (this.status !== 'CONNECTED') return [];
        try {
            const chats = await this.client.getChats();
            return chats
                .filter(chat => chat.isGroup)
                .map(chat => ({
                    id: chat.id._serialized,
                    name: chat.name,
                    unreadCount: chat.unreadCount
                }));
        } catch (error) {
            console.error('Error in getGroups:', error);
            throw error;
        }
    }

    async getChats() {
        if (this.status !== 'CONNECTED') {
            console.log(`getChats failed: Status is ${this.status}`);
            return [];
        }
        try {
            console.log('Fetching all active chats from WhatsApp client...');
            const chats = await this.client.getChats();
            console.log(`Found ${chats.length} raw chats.`);
            
            // Map basic data first to ensure we return something quickly
            const resolvedChats = chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name || chat.id.user,
                lastMessage: chat.lastMessage ? {
                    body: chat.lastMessage.body,
                    timestamp: chat.lastMessage.timestamp,
                    fromMe: chat.lastMessage.fromMe
                } : null,
                unreadCount: chat.unreadCount,
                timestamp: (chat.timestamp || 0) * 1000
            }));

            return resolvedChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } catch (error) {
            console.error('Error in getChats:', error);
            return [];
        }
    }

    async getChatMessages(chatId, limit = 50) {
        if (this.status !== 'CONNECTED') return [];
        try {
            const chat = await this.client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit });
            return messages.map(msg => ({
                id: msg.id.id,
                from: msg.from,
                to: msg.to,
                body: msg.body,
                type: msg.type,
                timestamp: msg.timestamp,
                isFromMe: msg.fromMe
            }));
        } catch (error) {
            console.error(`Error fetching history for ${chatId}:`, error);
            return [];
        }
    }

    async getGroupParticipants(groupId) {
        if (this.status !== 'CONNECTED') return [];
        const chat = await this.client.getChatById(groupId);
        if (!chat.isGroup) return [];
        
        console.log(`Resolving metadata for ${chat.participants.length} participants...`);
        const decodedParticipants = [];
        
        // Use a sequential loop with a small delay to avoid overloading metadata lookups
        for (const p of chat.participants) {
            try {
                const contact = await this.client.getContactById(p.id._serialized);
                const profilePic = await contact.getProfilePicUrl().catch(() => null);
                
                // Robust name resolution
                const resolvedName = contact.name || contact.pushname || contact.shortName || contact.number || 'Anonymous Contact';
                
                decodedParticipants.push({
                    id: p.id._serialized,
                    number: p.id.user,
                    name: resolvedName,
                    profilePic: profilePic,
                    isAdmin: p.isAdmin,
                    isSuperAdmin: p.isSuperAdmin
                });

                // Small delay to prevent rate-limiting/sync issues
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (err) {
                console.error(`Failed to resolve contact ${p.id.user}:`, err);
                decodedParticipants.push({
                    id: p.id._serialized,
                    number: p.id.user,
                    name: p.id.user, // Fallback to number if lookup fails entirely
                    profilePic: null,
                    isAdmin: p.isAdmin,
                    isSuperAdmin: p.isSuperAdmin
                });
            }
        }

        console.log(`Successfully resolved ${decodedParticipants.length} group participants.`);
        return decodedParticipants;
    }

    async sendMessage(number, message, force = false, mediaPath = null) {
        if (this.status !== 'CONNECTED') throw new Error('Not connected to WhatsApp');
        
        // Generate a hash for the message body to prevent duplicates
        const msgHash = crypto.createHash('md5').update(message + (mediaPath || '')).digest('hex');
        
        if (!force && storage.hasBeenSent(number, msgHash)) {
            console.log(`Skipping duplicate message to ${number}`);
            return { success: false, skipped: true, reason: 'Duplicate' };
        }

        try {
            // Ensure number is in correct format
            const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
            
            let result;
            if (mediaPath && fs.existsSync(mediaPath)) {
                const media = MessageMedia.fromFilePath(mediaPath);
                result = await this.client.sendMessage(formattedNumber, media, { caption: message });
            } else {
                result = await this.client.sendMessage(formattedNumber, message);
            }
            
            // Log successful send
            storage.logSentMessage(number, msgHash, 'success');
            
            return { success: true };
        } catch (error) {
            console.error('Error sending message:', error);
            storage.logSentMessage(number, msgHash, 'failed');
            return { success: false, error: error.message };
        }
    }
}

module.exports = WhatsAppHandler;
