import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as api from './utils/api';

// Mock the API functions
vi.mock('./utils/api', () => ({
  fetchConfig: vi.fn(),
  generateIdeas: vi.fn(),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ hasGeminiKey: true });
  });

  it('renders the initial App component with Header and Slogan', async () => {
    render(<App />);

    // Check for the header text
    expect(screen.getByText('Faceless Reels AI')).toBeInTheDocument();

    // Check for slogan elements
    expect(screen.getByText('Create cinematic aesthetic quote reels')).toBeInTheDocument();

    // Wait for the fetchConfig call to resolve
    await waitFor(() => {
      expect(api.fetchConfig).toHaveBeenCalledTimes(1);
    });
  });

  it('generates ideas and transitions to step 2', async () => {
    // Mock the API response
    const mockIdeas = [
      { id: '1', text: 'Idea 1' },
      { id: '2', text: 'Idea 2' },
    ];
    (api.generateIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({ ideas: mockIdeas });

    const user = userEvent.setup();
    render(<App />);

    // Check that we're initially on step 1 by looking for the generate button
    const generateButton = screen.getByRole('button', { name: /generate/i });
    expect(generateButton).toBeInTheDocument();

    // Click the generate button
    const clickPromise = user.click(generateButton);

    // Verify loading state is shown temporarily
    await waitFor(() => {
      expect(screen.getByText('Generating Deep Aesthetic Designs...')).toBeInTheDocument();
    });

    await clickPromise;

    // Verify generateIdeas API was called
    await waitFor(() => {
      expect(api.generateIdeas).toHaveBeenCalledTimes(1);
    });

    // Check if we transition to Step 2 (IdeaCards component)
    // Slogan shouldn't be there
    expect(screen.queryByText('Create cinematic aesthetic quote reels')).not.toBeInTheDocument();
  });
});
