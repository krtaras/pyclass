export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1) || null;
    } else if (u.searchParams.get("v")) {
      id = u.searchParams.get("v");
    } else {
      const m = u.pathname.match(/\/embed\/([^/]+)/);
      id = m?.[1] ?? null;
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
