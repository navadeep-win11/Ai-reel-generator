import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import IdeaCards from './IdeaCards';
import { IdeaItem, VisualStyle } from './types';

// Mock getAestheticImage to avoid any external dependencies issues
vi.mock('./utils/imageCurator', () => ({
  getAestheticImage: vi.fn(() => 'mocked-image-url.jpg')
}));

const mockIdeas: IdeaItem[] = [
  {
    id: '1',
    quote: 'Test quote 1',
    imagePrompt: 'Prompt 1',
    suggestedVoice: 'Puck'
  },
  {
    id: '2',
    quote: 'Test quote 2',
    quoteTranslation: 'Translation 2',
    imagePrompt: 'Prompt 2',
    suggestedVoice: 'Kore'
  }
];

const mockVisualStyle: VisualStyle = 'dark_minimalist';

describe('IdeaCards Component', () => {
  let onCreateReelMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCreateReelMock = vi.fn();
  });

  it('renders nothing when ideas array is empty', () => {
    const { container } = render(
      <IdeaCards
        ideas={[]}
        visualStyle={mockVisualStyle}
        onCreateReel={onCreateReelMock}
        isRendering={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders ideas correctly and auto-selects the first one', () => {
    render(
      <IdeaCards
        ideas={mockIdeas}
        visualStyle={mockVisualStyle}
        onCreateReel={onCreateReelMock}
        isRendering={false}
      />
    );

    // Check if both ideas are rendered
    expect(screen.getByText('“Test quote 1”')).toBeInTheDocument();
    expect(screen.getByText('“Test quote 2”')).toBeInTheDocument();

    // Check if the first idea is auto-selected by checking if the CheckCircle2 icon (or its container) is rendered for the first item
    // A simple way is to check the CSS class of the card or the button disabled state.
    // The "Create Selected Reel" button should be enabled because the first idea is auto-selected
    const createButton = screen.getByText('Create Selected Reel (Step 3)').closest('button');
    expect(createButton).not.toBeDisabled();

    // Test quote 2's translation is rendered
    expect(screen.getByText('Translation 2')).toBeInTheDocument();
  });

  it('updates selection when a different idea card is clicked', () => {
    render(
      <IdeaCards
        ideas={mockIdeas}
        visualStyle={mockVisualStyle}
        onCreateReel={onCreateReelMock}
        isRendering={false}
      />
    );

    // Click on the second idea card
    const secondIdeaCard = screen.getByText('“Test quote 2”').closest('.group');
    if (secondIdeaCard) {
      fireEvent.click(secondIdeaCard);
    }

    // The create button should still be enabled
    const createButton = screen.getByText('Create Selected Reel (Step 3)').closest('button');
    expect(createButton).not.toBeDisabled();

    // Click create button to verify it was the second idea selected
    if (createButton) {
      fireEvent.click(createButton);
    }

    expect(onCreateReelMock).toHaveBeenCalledWith(mockIdeas[1]);
  });

  it('calls onCreateReel with the selected idea when "Create Selected Reel" is clicked', () => {
    render(
      <IdeaCards
        ideas={mockIdeas}
        visualStyle={mockVisualStyle}
        onCreateReel={onCreateReelMock}
        isRendering={false}
      />
    );

    const createButton = screen.getByText('Create Selected Reel (Step 3)').closest('button');

    // First idea is auto-selected
    if (createButton) {
      fireEvent.click(createButton);
    }

    expect(onCreateReelMock).toHaveBeenCalledWith(mockIdeas[0]);
    expect(onCreateReelMock).toHaveBeenCalledTimes(1);
  });

  it('disables the "Create Selected Reel" button when isRendering is true', () => {
    render(
      <IdeaCards
        ideas={mockIdeas}
        visualStyle={mockVisualStyle}
        onCreateReel={onCreateReelMock}
        isRendering={true}
      />
    );

    const createButton = screen.getByText('Create Selected Reel (Step 3)').closest('button');
    expect(createButton).toBeDisabled();
  });
});
