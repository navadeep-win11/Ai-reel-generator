import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReelPreview from './ReelPreview';
import { phonkSynth } from './utils/phonkSynth';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the synth and API
vi.mock('./utils/phonkSynth', () => ({
  phonkSynth: {
    start: vi.fn(),
    stop: vi.fn(),
  }
}));

vi.mock('./utils/api', () => ({
  generateTTS: vi.fn().mockResolvedValue({ base64Audio: 'mockBase64' }),
  API_BASE: 'mockApiBase'
}));

// Provide a mock for Audio that returns a promise from play()
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  currentTime = 0;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

beforeEach(() => {
  window.Audio = MockAudio as any;
  window.speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
  } as any;
});

const mockIdea = {
  id: '1',
  title: 'Test Idea',
  topic: 'Test Topic',
  hook: 'Test Hook',
  body: 'Test Body',
  cta: 'Test CTA',
  quote: 'Test Quote',
  visualStyle: 'dark',
  suggestedVoice: 'Fenrir'
};

const mockControls = {
  visualStyle: 'dark' as any,
  voiceoverOn: true,
  phonkBgmOn: true
};

describe('ReelPreview', () => {
  const originalConsoleWarn = console.warn;
  const originalImage = window.Image;

  beforeEach(() => {
    vi.clearAllMocks();
    console.warn = vi.fn();

    // Simple Image mock so onload triggers immediately
    window.Image = class {
      onload: () => void = () => {};
      constructor() {
        setTimeout(() => this.onload(), 0);
      }
    } as any;
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    window.Image = originalImage;
  });

  it('handles phonkSynth.start() promise rejection correctly', async () => {
    // Mock the start method to reject
    const mockError = new Error('Test synth error');
    (phonkSynth.start as any).mockRejectedValue(mockError);

    render(
      <ReelPreview idea={mockIdea as any} controls={mockControls} onReset={() => {}} />
    );

    // Wait for the pipeline to finish and the component to be ready.
    await waitFor(() => {
      // The class switches or UI changes when pipelineStep === 2
      expect(screen.getByText(/Export & Compile MP4/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // The play button has an id play-reels-player-btn, and no inner text so find by ID or nearest role
    const playButton = document.getElementById('play-reels-player-btn');
    expect(playButton).not.toBeNull();

    // Find the Play button and click it to trigger startPlayback
    fireEvent.click(playButton!);

    // Assert that phonkSynth.start was called
    expect(phonkSynth.start).toHaveBeenCalled();

    // The catch block uses console.warn to log the error
    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith('Synth failed:', mockError);
    });
  });
});
