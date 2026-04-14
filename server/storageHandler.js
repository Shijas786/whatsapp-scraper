const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class StorageHandler {
    constructor() {
        // Ensure data directory exists
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Open SQLite database
        this.db = new Database(path.join(dataDir, 'scraper.db'));
        this.db.pragma('journal_mode = WAL'); // Better write performance
        this.db.pragma('foreign_keys = ON');

        // Simple migration check: if userId exists but we are in single-tenant, it's fine.
        // We just need to make sure we don't crash on standard queries.

        this._initSchema();
        console.log('[SQLite] Database initialized at data/scraper.db');
    }

    _initSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contacts (
                number      TEXT PRIMARY KEY,
                name        TEXT,
                profilePic  TEXT,
                groupName   TEXT,
                tags        TEXT DEFAULT '[]',
                addedAt     TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id          TEXT PRIMARY KEY,
                fromId      TEXT NOT NULL,
                toId        TEXT NOT NULL,
                body        TEXT,
                type        TEXT DEFAULT 'chat',
                timestamp   INTEGER NOT NULL,
                isFromMe    INTEGER DEFAULT 0,
                savedAt     TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(fromId);
            CREATE INDEX IF NOT EXISTS idx_messages_to   ON messages(toId);
            CREATE INDEX IF NOT EXISTS idx_messages_ts   ON messages(timestamp);

            CREATE TABLE IF NOT EXISTS sent_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                number      TEXT NOT NULL,
                messageHash TEXT NOT NULL,
                status      TEXT DEFAULT 'success',
                sentAt      TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sent_log_number ON sent_log(number);
            CREATE INDEX IF NOT EXISTS idx_sent_log_hash   ON sent_log(messageHash);

            CREATE TABLE IF NOT EXISTS activity (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                action      TEXT NOT NULL,
                timestamp   TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS templates (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                body        TEXT NOT NULL,
                updatedAt   TEXT NOT NULL
            );
        `);
    }

    // ── CONTACTS ─────────────────────────────────────────────────────────────

    getContacts() {
        const rows = this.db.prepare('SELECT * FROM contacts ORDER BY addedAt DESC').all();
        return rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
    }

    saveContacts(contacts = [], source = 'Scraper') {
        const insert = this.db.prepare(`
            INSERT INTO contacts (number, name, profilePic, groupName, tags, addedAt)
            VALUES (@number, @name, @profilePic, @groupName, @tags, @addedAt)
            ON CONFLICT(number) DO UPDATE SET
                name       = excluded.name,
                profilePic = excluded.profilePic,
                groupName  = excluded.groupName
        `);

        let addedCount = 0;
        const now = new Date().toISOString();
        const upsertMany = this.db.transaction((contacts) => {
            for (const c of contacts) {
                if (!c.number) continue;
                const existing = this.db.prepare('SELECT number FROM contacts WHERE number = ?').get(c.number);
                if (!existing) addedCount++;
                insert.run({
                    number:     c.number,
                    name:       c.name || null,
                    profilePic: c.profilePic || null,
                    groupName:  c.groupName || source,
                    tags:       JSON.stringify(c.tags || []),
                    addedAt:    now
                });
            }
        });

        upsertMany(contacts);
        this.logActivity(`Saved ${addedCount} new contacts from "${source}"`);
        return addedCount;
    }

    deleteContact(number) {
        const result = this.db.prepare('DELETE FROM contacts WHERE number = ?').run(number);
        if (result.changes > 0) {
            this.logActivity(`Deleted contact ${number}`);
            return true;
        }
        return false;
    }

    addTag(number, tag) {
        const row = this.db.prepare('SELECT tags FROM contacts WHERE number = ?').get(number);
        if (!row) return false;
        const tags = JSON.parse(row.tags || '[]');
        if (tags.includes(tag)) return false;
        tags.push(tag);
        this.db.prepare('UPDATE contacts SET tags = ? WHERE number = ?').run(JSON.stringify(tags), number);
        return true;
    }

    removeTag(number, tag) {
        const row = this.db.prepare('SELECT tags FROM contacts WHERE number = ?').get(number);
        if (!row) return false;
        const tags = JSON.parse(row.tags || '[]').filter(t => t !== tag);
        this.db.prepare('UPDATE contacts SET tags = ? WHERE number = ?').run(JSON.stringify(tags), number);
        return true;
    }

    // ── MESSAGES ─────────────────────────────────────────────────────────────

    getMessages() {
        return this.db.prepare('SELECT * FROM messages ORDER BY timestamp ASC').all().map(r => ({
            ...r,
            isFromMe: !!r.isFromMe
        }));
    }

    saveMessage(msg) {
        if (!msg || (!msg.id && !msg.body)) return;
        const id = msg.id || `${Date.now()}-${Math.random()}`;
        this.db.prepare(`
            INSERT OR IGNORE INTO messages (id, fromId, toId, body, type, timestamp, isFromMe, savedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            msg.from || '',
            msg.to || '',
            msg.body || '',
            msg.type || 'chat',
            msg.timestamp || Math.floor(Date.now() / 1000),
            msg.isFromMe ? 1 : 0,
            new Date().toISOString()
        );
    }

    // ── SENT LOG ─────────────────────────────────────────────────────────────

    hasBeenSent(number, messageHash) {
        const row = this.db.prepare(
            "SELECT id FROM sent_log WHERE number = ? AND messageHash = ? AND status = 'success' LIMIT 1"
        ).get(number, messageHash);
        return !!row;
    }

    logSentMessage(number, messageHash, status = 'success') {
        this.db.prepare(
            'INSERT INTO sent_log (number, messageHash, status, sentAt) VALUES (?, ?, ?, ?)'
        ).run(number, messageHash, status, new Date().toISOString());

        // Prune old records > 10,000
        const count = this.db.prepare('SELECT COUNT(*) as c FROM sent_log').get().c;
        if (count > 10000) {
            this.db.prepare('DELETE FROM sent_log WHERE id IN (SELECT id FROM sent_log ORDER BY id ASC LIMIT ?)').run(count - 10000);
        }

        if (status === 'success') {
            this.logActivity(`Successfully sent message to ${number} ✨`);
        } else {
            this.logActivity(`Message failed for ${number} ❌`);
        }
    }

    // ── TEMPLATES ────────────────────────────────────────────────────────────

    getTemplates() {
        return this.db.prepare('SELECT * FROM templates ORDER BY updatedAt DESC').all();
    }

    saveTemplate(template) {
        const id = template.id || Date.now().toString();
        const now = new Date().toISOString();
        this.db.prepare(`
            INSERT INTO templates (id, name, body, updatedAt)
            VALUES (@id, @name, @body, @updatedAt)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, body = excluded.body, updatedAt = excluded.updatedAt
        `).run({ id, name: template.name || 'Untitled', body: template.body || '', updatedAt: now });
        return this.db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    }

    deleteTemplate(id) {
        const result = this.db.prepare('DELETE FROM templates WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ── ACTIVITY ──────────────────────────────────────────────────────────────

    logActivity(action) {
        this.db.prepare('INSERT INTO activity (action, timestamp) VALUES (?, ?)').run(action, new Date().toISOString());
        // Keep only last 100
        const count = this.db.prepare('SELECT COUNT(*) as c FROM activity').get().c;
        if (count > 100) {
            this.db.prepare('DELETE FROM activity WHERE id IN (SELECT id FROM activity ORDER BY id ASC LIMIT ?)').run(count - 100);
        }
    }

    // ── STATS ─────────────────────────────────────────────────────────────────

    getStats() {
        const totalContacts = this.db.prepare('SELECT COUNT(*) AS c FROM contacts').get().c;
        const totalMessages = this.db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
        const today = new Date().toDateString();
        const sentToday = this.db
            .prepare("SELECT COUNT(*) AS c FROM sent_log WHERE status = 'success' AND sentAt LIKE ?")
            .get(`${new Date().toISOString().slice(0, 10)}%`).c;

        const uniqueGroups = this.db.prepare('SELECT COUNT(DISTINCT groupName) AS c FROM contacts WHERE groupName IS NOT NULL').get().c;

        const recentActivity = this.db.prepare('SELECT action, timestamp FROM activity ORDER BY id DESC LIMIT 10').all();

        // Chart data: messages sent per day for last 7 days
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10);
            const count = this.db.prepare(
                "SELECT COUNT(*) AS c FROM sent_log WHERE status = 'success' AND sentAt LIKE ?"
            ).get(`${dateStr}%`).c;
            chartData.push({
                name: date.toLocaleDateString(undefined, { weekday: 'short' }),
                count
            });
        }

        // Source distribution
        const sourceRows = this.db.prepare(
            'SELECT groupName AS name, COUNT(*) AS value FROM contacts WHERE groupName IS NOT NULL GROUP BY groupName ORDER BY value DESC LIMIT 5'
        ).all();

        return {
            totalContacts,
            totalMessages,
            sentToday,
            uniqueGroups,
            recentActivity,
            chartData,
            sourceData: sourceRows
        };
    }
}

module.exports = new StorageHandler();
