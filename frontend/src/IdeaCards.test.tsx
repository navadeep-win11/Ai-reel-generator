import React from 'react';
import { render } from '@testing-library/react';
import IdeaCards from './IdeaCards';

describe('IdeaCards', () => {
  it('returns null when ideas collection is empty', () => {
    const { container } = render(
      <IdeaCards
        ideas={[]}
        visualStyle="cinematic_motorcycle"
        onCreateReel={() => {}}
        isRendering={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
