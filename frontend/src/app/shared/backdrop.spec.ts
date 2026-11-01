import { backdropImage, usesPosterAsBackdrop } from './backdrop';

describe('backdropImage', () => {
  it('uses the backdrop when there is one', () => {
    const movie = { backdrop_url: 'https://img/wide.jpg', poster_url: 'https://img/poster.jpg' };

    expect(backdropImage(movie)).toBe('https://img/wide.jpg');
    expect(usesPosterAsBackdrop(movie)).toBe(false);
  });

  it('falls back to the poster when the backdrop is empty', () => {
    for (const backdrop of [null, '']) {
      const movie = { backdrop_url: backdrop, poster_url: 'https://img/poster.jpg' };

      expect(backdropImage(movie)).toBe('https://img/poster.jpg');
      expect(usesPosterAsBackdrop(movie)).toBe(true);
    }
  });

  it('returns null when the movie has no images', () => {
    const movie = { backdrop_url: null, poster_url: null };

    expect(backdropImage(movie)).toBeNull();
    expect(usesPosterAsBackdrop(movie)).toBe(false);
  });
});
