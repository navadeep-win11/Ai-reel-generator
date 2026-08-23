import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchConfig, generateIdeas, generateTTS, API_BASE } from './api';

describe('API Utils', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  describe('fetchConfig', () => {
    it('should fetch config successfully', async () => {
      const mockConfig = { key: 'value' };
      (global.fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockConfig),
      });

      const result = await fetchConfig();

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/config`);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockConfig);
    });
  });

  describe('generateIdeas', () => {
    it('should generate ideas successfully', async () => {
      const mockIdeas = ['idea1', 'idea2'];
      const payload = {
        visualStyle: 'style',
        languageScript: 'script',
        topic: 'topic',
      };

      (global.fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockIdeas),
      });

      const result = await generateIdeas(payload);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/generate-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockIdeas);
    });
  });

  describe('generateTTS', () => {
    it('should generate TTS successfully', async () => {
      const mockAudio = { audioUrl: 'http://example.com/audio.mp3' };
      const payload = {
        text: 'hello world',
        voice: 'en-US-JennyNeural',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAudio),
      });

      const result = await generateTTS(payload);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAudio);
    });

    it('should throw an error when TTS fails', async () => {
      const payload = {
        text: 'hello world',
        voice: 'en-US-JennyNeural',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await expect(generateTTS(payload)).rejects.toThrow('TTS Failed');

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
