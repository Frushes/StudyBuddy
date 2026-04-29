// Centralized API Configuration
// VITE_API_URL will be provided by your deployment platform (e.g., Render, Vercel).
// If it's not set (like when developing locally), it defaults to localhost.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';
