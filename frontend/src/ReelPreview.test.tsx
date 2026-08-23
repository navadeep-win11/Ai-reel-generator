import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReelPreview from './ReelPreview';
import { IdeaItem, ReelControls } from './types';
import { generateTTS } from './utils/api';

// Mock dependencies
vi.mock('./utils/imageCurator', () => ({
  getAestheticImage: vi.fn(() => 'mock-image-url'),
}));
vi.mock('./utils/phonkSynth', () => ({
  phonkSynth: { start: vi.fn(() => Promise.resolve()), stop: vi.fn() },
}));
vi.mock('./utils/api', () => ({
  generateTTS: vi.fn(() => Promise.resolve({ base64Audio: 'mock-audio-base64' })),
  API_BASE: 'http://localhost:3000',
}));

describe('ReelPreview', () => {
  const mockIdea: IdeaItem = {
    id: '1',
    quote: 'Stay hard',
    imagePrompt: 'Dark minimal gym',
    suggestedVoice: 'Puck',
  };

  const mockControls: ReelControls = {
    visualStyle: 'dark_minimalist',
    languageScript: 'english',
    voiceoverOn: true,
    phonkBgmOn: true,
    selectedFont: 'Inter',
    duration: 15,
    topic: 'Grind & Success',
  };

  const mockOnReset = vi.fn();

  let originalFetch: typeof global.fetch;
  let originalURL: typeof window.URL.createObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock HTMLMediaElement methods
    window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();

    // Mock SpeechSynthesis API
    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => []),
    } as unknown as SpeechSynthesis;

    // Mock AudioContext
    window.AudioContext = vi.fn().mockImplementation(() => ({
      createMediaStreamDestination: vi.fn(() => ({ stream: 'mock-stream' })),
      resume: vi.fn(),
      close: vi.fn(),
    })) as unknown as typeof window.AudioContext;

    // Mock global fetch for compileAndDownloadVideo
    originalFetch = global.fetch;
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['mock-video-data'], { type: 'video/mp4' })),
      })
    ) as any;

    originalURL = window.URL.createObjectURL;
    window.URL.createObjectURL = vi.fn(() => 'mock-blob-url');

    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.URL.createObjectURL = originalURL;
    vi.restoreAllMocks();
  });

  it('renders correctly with no idea', () => {
    const { container } = render(<ReelPreview idea={null} controls={mockControls} onReset={mockOnReset} />);
    expect(container.querySelector('#reel-preview-grand-container')).toBeInTheDocument();
    expect(screen.queryByText('Executing GPU Multi-Track Render Layer')).toBeNull();
  });

  it('renders preview UI when idea is provided and goes through pipeline', async () => {
    render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    expect(screen.getByText('Executing GPU Multi-Track Render Layer')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles playback toggling (play/pause)', async () => {
    const { container } = render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    await waitFor(() => {
        expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    const playPauseBtn = container.querySelector('#play-reels-player-btn');
    expect(playPauseBtn).toBeInTheDocument();

    fireEvent.click(playPauseBtn!);

    await waitFor(() => {
        expect(container.querySelector('.lucide-pause')).toBeInTheDocument();
    });
  });

  it('calls onReset when back button is clicked', async () => {
    const { container } = render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    await waitFor(() => {
        expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    const backBtn = container.querySelector('#back-to-controls-hdr-btn');
    fireEvent.click(backBtn!);

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('handles pipeline errors gracefully', async () => {
    // Mock generateTTS to throw an error
    (generateTTS as any).mockRejectedValueOnce(new Error('TTS API failed'));

    render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    await waitFor(() => {
      expect(screen.getByText('Pipeline Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('TTS API failed')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click "Go Back & Try Again"
    fireEvent.click(screen.getByText('Go Back & Try Again'));
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('skips TTS when voiceoverOn is false', async () => {
    const noVoiceControls = { ...mockControls, voiceoverOn: false };
    render(<ReelPreview idea={mockIdea} controls={noVoiceControls} onReset={mockOnReset} />);

    await waitFor(() => {
        expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(generateTTS).not.toHaveBeenCalled();
  });

  it('handles compile and download video button success', async () => {
    const { container } = render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    await waitFor(() => {
        expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    const compileBtn = screen.getByText('Export & Compile MP4').closest('button');
    expect(compileBtn).toBeInTheDocument();

    fireEvent.click(compileBtn!);

    await waitFor(() => {
        expect(screen.getByText('Reel Compiled successfully')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('handles compile and download video button failure', async () => {
    // mock fetch to fail
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) as any;

    const { container } = render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    await waitFor(() => {
        expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    const compileBtn = screen.getByText('Export & Compile MP4').closest('button');
    expect(compileBtn).toBeInTheDocument();

    fireEvent.click(compileBtn!);

    await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to render video on the backend server.');
    }, { timeout: 5000 });
  });

  it('handles compile and download video button failure not ok', async () => {
    // mock fetch to fail
    global.fetch = vi.fn(() => Promise.resolve({ ok: false })) as any;

    const { container } = render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    await waitFor(() => {
        expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    const compileBtn = screen.getByText('Export & Compile MP4').closest('button');
    expect(compileBtn).toBeInTheDocument();

    fireEvent.click(compileBtn!);

    await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to render video on the backend server.');
    }, { timeout: 5000 });
  });

  it('calls onReset via configure another reel button', async () => {
    const { container } = render(<ReelPreview idea={mockIdea} controls={mockControls} onReset={mockOnReset} />);

    await waitFor(() => {
        expect(screen.getByText('Reel Render Complete')).toBeInTheDocument();
    }, { timeout: 3000 });

    const resetBtn = container.querySelector('#reset-creator-btn');
    fireEvent.click(resetBtn!);

    expect(mockOnReset).toHaveBeenCalled();
  });
});
