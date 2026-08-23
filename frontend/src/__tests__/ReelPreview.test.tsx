import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ReelPreview from '../ReelPreview';
import { IdeaItem, ReelControls, VisualStyle, LanguageScript } from '../types';
import * as apiModule from '../utils/api';

vi.mock('../utils/api', () => ({
  generateTTS: vi.fn(),
  API_BASE: 'http://localhost'
}));

vi.mock('../utils/phonkSynth', () => ({
  phonkSynth: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn()
  }
}));

const mockIdea: IdeaItem = {
  id: '1',
  quote: 'Just do it.',
  imagePrompt: 'A simple image',
  suggestedVoice: 'Fenrir'
};

const mockControls: ReelControls = {
  voiceoverOn: true,
  phonkBgmOn: true,
  duration: 15,
  visualStyle: 'dark_minimalist',
  languageScript: 'english',
  selectedFont: 'sans',
  topic: 'Motivation',
};

describe('ReelPreview TTS Error Handling', () => {
  let originalAudio: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalAudio = window.Audio;
  });

  afterEach(() => {
    window.Audio = originalAudio;
  });

  it('should handle TTS audio play promise rejection gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockedError = new Error('Mocked audio play error');
    const playMock = vi.fn().mockRejectedValue(mockedError);

    class MockAudio {
      currentTime = 0;
      play = playMock;
      pause = vi.fn();
      constructor() {}
    }

    vi.stubGlobal('Audio', MockAudio);

    vi.mocked(apiModule.generateTTS).mockResolvedValue({ base64Audio: 'fake-base64' });

    const { container } = render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(apiModule.generateTTS).toHaveBeenCalled();

    const playButton = container.querySelector('#play-reels-player-btn');
    expect(playButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(playButton!);
    });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith('Audio play error:', mockedError);
    });

    consoleWarnSpy.mockRestore();
  });
});
