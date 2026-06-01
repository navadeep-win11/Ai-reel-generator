export const API_BASE = 'https://ai-reel-generator-production.up.railway.app/api';

export const fetchConfig = async () => {
  const response = await fetch(`${API_BASE}/config`);
  return response.json();
};

export const generateIdeas = async (payload: { visualStyle: string; languageScript: string; topic: string }) => {
  const response = await fetch(`${API_BASE}/generate-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const generateTTS = async (payload: { text: string; voice: string }) => {
  const response = await fetch(`${API_BASE}/generate-tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('TTS Failed');
  return response.json();
};
