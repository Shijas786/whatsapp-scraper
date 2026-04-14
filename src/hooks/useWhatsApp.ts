'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '@/lib/config';

export function useWhatsApp() {
    const [status, setStatus] = useState('DISCONNECTED');
    const [qr, setQr] = useState('');
    const [socket, setSocket] = useState(null);

    const [messages, setMessages] = useState([]);

    useEffect(() => {
        // Use production-grade transports and error handling
        const newSocket = io(API_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
        });

        newSocket.on('status', (data) => {
            setStatus(data.status);
            if (data.qr) setQr(data.qr);
            else setQr('');
        });

        newSocket.on('new_message', (msg) => {
            setMessages(prev => [...prev.slice(-99), msg]);
        });

        // Initial status fetch
        fetch(`${API_URL}/status`)
            .then(res => res.json())
            .then(data => {
                setStatus(data.status);
                setQr(data.qr || '');
            })
            .catch(err => console.error('Error fetching status:', err));

        // Initial messages fetch
        fetch(`${API_URL}/messages`)
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error('Error fetching messages:', err));

        return () => newSocket.close();
    }, []);

    const fetchGroups = async () => {
        const res = await fetch(`${API_URL}/groups`);
        return res.json();
    };

    const fetchParticipants = async (groupId) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/participants`);
        return res.json();
    };

    const fetchContacts = async () => {
        const res = await fetch(`${API_URL}/contacts`);
        return res.json();
    };

    const deleteContact = async (number) => {
        const res = await fetch(`${API_URL}/contacts/${encodeURIComponent(number)}`, {
            method: 'DELETE'
        });
        return res.json();
    };

    const fetchStats = async () => {
        const res = await fetch(`${API_URL}/stats`);
        return res.json();
    };

    const saveContacts = async (contacts, source = 'Scraper') => {
        const res = await fetch(`${API_URL}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contacts, source })
        });
        return res.json();
    };

    const sendMessage = async (number, message, force = false, mediaPath = null) => {
        const res = await fetch(`${API_URL}/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number, message, force, mediaPath })
        });
        return res.json();
    };

    const logout = async () => {
        const res = await fetch(`${API_URL}/logout`, { method: 'POST' });
        return res.json();
    };

    return {
        status,
        qr,
        messages,
        fetchGroups,
        fetchParticipants,
        fetchContacts,
        saveContacts,
        sendMessage,
        deleteContact,
        fetchStats,
        logout,
        isConnected: status === 'CONNECTED'
    };
}
