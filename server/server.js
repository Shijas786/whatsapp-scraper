const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const WhatsAppHandler = require('./whatsappHandler');
const storage = require('./storageHandler');

const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();

// Production CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

app.use(express.json());
app.use(fileUpload());

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const server = http.createServer(app);

// Production Socket.io configuration
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"],
        credentials: false
    },
    transports: ['websocket', 'polling'], // Critical for Railway/Vercel
    allowEIO3: true
});

const handler = new WhatsAppHandler(io);
handler.initialize();

console.log('--- SERVER STARTUP ---');
console.log('[SQLite] Storage layer active — data/scraper.db');

// API Endpoints
app.get('/status', (req, res) => res.json(handler.getStatus()));

app.get('/stats', (req, res) => {
    res.json(storage.getStats());
});

app.get('/groups', async (req, res) => {
    try {
        const groups = await handler.getGroups();
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/chats', async (req, res) => {
    try {
        const chats = await handler.getChats();
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/chats/:id/messages', async (req, res) => {
    try {
        const messages = await handler.getChatMessages(req.params.id);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/groups/:id/participants', async (req, res) => {
    try {
        const participants = await handler.getGroupParticipants(req.params.id);
        res.json(participants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Persistence Endpoints
app.get('/contacts', (req, res) => {
    res.json(storage.getContacts());
});

app.post('/contacts', (req, res) => {
    const { contacts, source } = req.body;
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts array required' });
    const count = storage.saveContacts(contacts, source);
    res.json({ success: true, count });
});

// Legacy bulk save route (kept for compatibility)
app.post('/contacts/save-bulk', (req, res) => {
    const { contacts, source } = req.body;
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts array required' });
    const count = storage.saveContacts(contacts, source);
    res.json({ success: true, count });
});

app.delete('/contacts/:number', (req, res) => {
    const success = storage.deleteContact(req.params.number);
    res.json({ success });
});

app.post('/contacts/:number/tags', (req, res) => {
    const success = storage.addTag(req.params.number, req.body.tag);
    res.json({ success });
});

app.delete('/contacts/:number/tags/:tag', (req, res) => {
    const success = storage.removeTag(req.params.number, req.params.tag);
    res.json({ success });
});

// Messaging Endpoints
app.get('/messages', (req, res) => {
    res.json(storage.getMessages());
});

app.post('/send-message', async (req, res) => {
    try {
        const { number, message, force, mediaPath } = req.body;
        const result = await handler.sendMessage(number, message, force, mediaPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/upload', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: 'No files were uploaded.' });
    }
    const file = req.files.file;
    const fileName = `${Date.now()}_${file.name}`;
    const uploadPath = path.join(uploadDir, fileName);

    file.mv(uploadPath, (err) => {
        if (err) return res.status(500).send(err);
        res.json({ 
            success: true, 
            name: file.name,
            path: uploadPath 
        });
    });
});

// Templates Endpoints
app.get('/templates', (req, res) => {
    res.json(storage.getTemplates());
});

app.post('/templates', (req, res) => {
    const template = storage.saveTemplate(req.body);
    res.json({ success: true, template });
});

app.delete('/templates/:id', (req, res) => {
    const success = storage.deleteTemplate(req.params.id);
    res.json({ success });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
