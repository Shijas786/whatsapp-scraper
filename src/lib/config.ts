// Central API URL - reads from env in production, falls back to localhost for dev
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://whatsapp-scraper-production-1e96.up.railway.app';
