const svgCache = new Map<string, Promise<string>>();

export async function loadSvgSource(url: string): Promise<string> {
  if (!url) {
    throw new Error('vectorizedSvgUrl is required');
  }

  if (!svgCache.has(url)) {
    const promise = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG (${response.status} ${response.statusText})`);
        }
        return response.text();
      })
      .catch((error) => {
        svgCache.delete(url);
        throw error;
      });

    svgCache.set(url, promise);
  }

  return svgCache.get(url)!;
}

export function clearSvgCache(url?: string) {
  if (url) {
    svgCache.delete(url);
  } else {
    svgCache.clear();
  }
}
