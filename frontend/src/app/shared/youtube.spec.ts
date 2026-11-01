import { getYoutubeId } from './youtube';

describe('getYoutubeId', () => {
  it('reads the id from common YouTube links', () => {
    expect(getYoutubeId('https://www.youtube.com/watch?v=YoHD9XEInc0')).toBe('YoHD9XEInc0');
    expect(getYoutubeId('https://youtu.be/YoHD9XEInc0?t=10')).toBe('YoHD9XEInc0');
    expect(getYoutubeId('https://www.youtube.com/embed/YoHD9XEInc0')).toBe('YoHD9XEInc0');
    expect(getYoutubeId('https://youtube.com/shorts/YoHD9XEInc0')).toBe('YoHD9XEInc0');
  });

  it('rejects other sites and unsafe input', () => {
    expect(getYoutubeId('https://vimeo.com/123')).toBeNull();
    expect(getYoutubeId('https://evil.com/watch?v=YoHD9XEInc0')).toBeNull();
    expect(getYoutubeId('javascript:alert(1)')).toBeNull();
    expect(getYoutubeId('https://www.youtube.com/watch?v=abc"><script>')).toBeNull();
    expect(getYoutubeId(null)).toBeNull();
  });
});
