export function normalizeImageUrl(url: string) {
  if (!url) return url;

  if (url.startsWith("/uploads/")) {
    const filename = url.split("/").pop() || "";
    return filename ? `/api/upload/${filename}` : url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/uploads/")) {
      const filename = parsed.pathname.split("/").pop() || "";
      if (!filename) return url;
      return `/api/upload/${filename}`;
    }
  } catch {
    // keep original URL if parsing fails
  }

  return url;
}
