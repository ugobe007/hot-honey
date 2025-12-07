// Centralized API configuration
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * API client helper for backend endpoints
 * Use this for file uploads and syndicate forms
 * For data operations, use Supabase client directly
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Upload a file to the backend
 */
export async function uploadFile(file: File): Promise<{ filename: string; originalname: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/api/documents`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`File upload failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Submit syndicate form
 */
export async function submitSyndicateForm(data: { name: string; email: string; message: string }) {
  return apiCall('/api/syndicates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
