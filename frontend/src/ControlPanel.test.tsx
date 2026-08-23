import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ControlPanel from './ControlPanel';

describe('ControlPanel', () => {
  it('renders correctly with default values', () => {
    render(<ControlPanel onGenerate={vi.fn()} isLoading={false} hasGeminiKey={true} />);

    // Check main title
    expect(screen.getByText('Reel Configuration')).toBeInTheDocument();

    // Check default select values (using htmlFor/id is better but DOM structure doesn't match label association, so we find by select id or content)
    // Actually the label lacks htmlFor so we use getByRole or test ID if we added them. Let's use getByDisplayValue or similar if possible.
    // Given the component, select elements have IDs we can use.
    const styleSelect = screen.getByDisplayValue(/Cinematic Motorcycle/i);
    expect((styleSelect as HTMLSelectElement).value).toBe('cinematic_motorcycle');

    const scriptSelect = screen.getByDisplayValue(/English \(Standard Stoic Grit\)/i);
    expect((scriptSelect as HTMLSelectElement).value).toBe('english');

    const fontSelect = screen.getByDisplayValue(/Space Grotesk/i);
    expect((fontSelect as HTMLSelectElement).value).toBe('Space Grotesk');

    // Check default active topic
    const topicButtons = screen.getAllByRole('button').filter(b => b.id.startsWith('topic-btn-'));
    const defaultTopicBtn = topicButtons.find(b => b.textContent === 'Grind & Stoic Success');
    expect(defaultTopicBtn).toHaveClass('bg-zinc-100'); // active state class
  });

  it('updates visual style when changed', () => {
    render(<ControlPanel onGenerate={vi.fn()} isLoading={false} hasGeminiKey={true} />);

    const styleSelect = screen.getByDisplayValue(/Cinematic Motorcycle/i);
    fireEvent.change(styleSelect, { target: { value: 'dark_minimalist' } });

    expect((styleSelect as HTMLSelectElement).value).toBe('dark_minimalist');
  });

  it('updates topic when clicked', () => {
    render(<ControlPanel onGenerate={vi.fn()} isLoading={false} hasGeminiKey={true} />);

    const newTopicBtn = screen.getByText('Wisdom of the Solitary');
    fireEvent.click(newTopicBtn);

    expect(newTopicBtn).toHaveClass('bg-zinc-100');
  });

  it('calls onGenerate with correct data when submitted', () => {
    const mockOnGenerate = vi.fn();
    render(<ControlPanel onGenerate={mockOnGenerate} isLoading={false} hasGeminiKey={true} />);

    // Change some default values
    const styleSelect = screen.getByDisplayValue(/Cinematic Motorcycle/i);
    fireEvent.change(styleSelect, { target: { value: 'watercolor' } });
    fireEvent.click(screen.getByText('Wisdom of the Solitary'));

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Generate 5 Premium Ideas/i });
    fireEvent.click(submitBtn);

    expect(mockOnGenerate).toHaveBeenCalledWith({
      visualStyle: 'watercolor',
      languageScript: 'english',
      topic: 'Wisdom of the Solitary',
      voiceoverOn: true,
      phonkBgmOn: true,
      selectedFont: 'Space Grotesk',
      duration: 15,
    });
  });

  it('disables submit button and shows loading state when isLoading is true', () => {
    render(<ControlPanel onGenerate={vi.fn()} isLoading={true} hasGeminiKey={true} />);

    const submitBtn = screen.getByRole('button', { name: /Generating Deep Aesthetic Designs.../i });
    expect(submitBtn).toBeDisabled();
  });
});
