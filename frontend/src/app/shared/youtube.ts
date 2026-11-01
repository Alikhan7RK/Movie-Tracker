// Gets the video id from a YouTube link, or returns null if the link is not a YouTube video.
// Works with: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
export function getYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^(www\.|m\.)/, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1);
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v');
    } else {
      const match = parsed.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
      id = match ? match[2] : null;
    }
  }

  // A real YouTube id is exactly 11 letters, digits, "-" or "_". Anything else is rejected,
  // so only a safe, known URL can ever be put into the iframe.
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
