import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchConfig, generateIdeas, generateTTS, API_BASE } from './api';

describe('API Utils', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchConfig', () => {
    it('should fetch configuration successfully', async () => {
      const mockData = { someConfig: true };
      mockFetch.mockResolvedValueOnce({
        json: async () => mockData,
      });

      const result = await fetchConfig();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/config`);
      expect(result).toEqual(mockData);
    });
  });

  describe('generateIdeas', () => {
    it('should generate ideas successfully', async () => {
      const payload = { visualStyle: 'cinematic', languageScript: 'en', topic: 'nature' };
      const mockData = { ideas: ['Idea 1', 'Idea 2'] };
      mockFetch.mockResolvedValueOnce({
        json: async () => mockData,
      });

      const result = await generateIdeas(payload);

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/generate-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('generateTTS', () => {
    it('should generate TTS successfully', async () => {
      const payload = { text: 'Hello World', voice: 'en-US-Standard-A' };
      const mockData = { audioUrl: 'http://example.com/audio.mp3' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await generateTTS(payload);

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(mockData);
    });

    it('should throw an error if TTS generation fails', async () => {
      const payload = { text: 'Hello World', voice: 'en-US-Standard-A' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(generateTTS(payload)).rejects.toThrow('TTS Failed');

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    });
  });
});
