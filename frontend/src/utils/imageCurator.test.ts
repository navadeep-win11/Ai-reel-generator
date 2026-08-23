import { describe, it, expect } from 'vitest';
import { getAestheticImage } from './imageCurator';

describe('getAestheticImage', () => {
  it('should return the first image for an existing style when no index is provided', () => {
    const result = getAestheticImage('pencil_sketch');
    expect(result).toBe("https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=700&auto=format&fit=crop");
  });

  it('should return the correct image for a valid index', () => {
    const result = getAestheticImage('watercolor', 2);
    expect(result).toBe("https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=700&auto=format&fit=crop");
  });

  it('should fallback to dark_minimalist for an unknown style', () => {
    const result = getAestheticImage('unknown_style_name');
    expect(result).toBe("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=700&auto=format&fit=crop");
  });

  it('should wrap around the index using modulo if index is larger than array length', () => {
    // dark_minimalist has 5 images (indices 0 to 4)
    // 6 % 5 = 1
    const result = getAestheticImage('dark_minimalist', 6);
    expect(result).toBe("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=700&auto=format&fit=crop");
  });

  it('should handle negative indices by taking the absolute value', () => {
    // Math.abs(-2) = 2, cinematic_motorcycle[2]
    const result = getAestheticImage('cinematic_motorcycle', -2);
    expect(result).toBe("https://images.unsplash.com/photo-1440615496174-ee7cebe1ec9f?q=80&w=700&auto=format&fit=crop");
  });
});
