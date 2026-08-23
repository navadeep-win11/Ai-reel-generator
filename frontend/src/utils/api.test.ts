import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API_BASE, fetchConfig, generateIdeas, generateTTS } from './api';

describe('API Utils', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchConfig', () => {
    it('should call fetch with the correct URL and return JSON', async () => {
      const mockConfig = { maxDuration: 60 };
      mockFetch.mockResolvedValueOnce({
        json: async () => mockConfig,
      });

      const result = await fetchConfig();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/config`);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockConfig);
    });
  });

  describe('generateIdeas', () => {
    it('should call fetch with POST method, correct headers, body, and return JSON', async () => {
      const payload = {
        visualStyle: 'cinematic',
        languageScript: 'english',
        topic: 'AI',
      };
      const mockIdeas = ['Idea 1', 'Idea 2'];

      mockFetch.mockResolvedValueOnce({
        json: async () => mockIdeas,
      });

      const result = await generateIdeas(payload);

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/generate-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockIdeas);
    });
  });

  describe('generateTTS', () => {
    it('should call fetch with POST method, correct headers, body, and return JSON on success', async () => {
      const payload = { text: 'Hello World', voice: 'en-US-Standard-A' };
      const mockResponse = { audioUrl: 'http://example.com/audio.mp3' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateTTS(payload);

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if the response is not ok', async () => {
      const payload = { text: 'Hello World', voice: 'en-US-Standard-A' };

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(generateTTS(payload)).rejects.toThrow('TTS Failed');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
