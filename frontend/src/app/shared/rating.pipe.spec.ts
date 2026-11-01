import { RatingPipe } from './rating.pipe';

describe('RatingPipe', () => {
  const pipe = new RatingPipe();

  it('formats a string rating from the API', () => {
    expect(pipe.transform('8.8')).toBe('★ 8.8/10');
  });

  it('always shows one decimal', () => {
    expect(pipe.transform(9)).toBe('★ 9.0/10');
  });

  it('shows a dash for missing values', () => {
    expect(pipe.transform(null)).toBe('★ –/10');
    expect(pipe.transform('abc')).toBe('★ –/10');
  });
});
