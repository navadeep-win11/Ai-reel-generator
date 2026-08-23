import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import App from './App';
import * as api from './utils/api';

// Mock the API utils
vi.mock('./utils/api', () => ({
  fetchConfig: vi.fn(),
  generateIdeas: vi.fn(),
}));

describe('App component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles promise rejection in fetchConfig correctly on mount', async () => {
    // Suppress console.log in test output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock fetchConfig to reject
    const mockError = new Error('Network error');
    vi.mocked(api.fetchConfig).mockRejectedValueOnce(mockError);

    render(<App />);

    // Wait for the effect to complete and the catch block to be hit
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Could not connect to config server:', mockError);
    });

    consoleSpy.mockRestore();
  });
});
