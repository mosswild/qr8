export const BASE_PATH = '/qr8';

/**
 * Returns a path with the application basePath prepended.
 * E.g. '/api/videos' -> '/qr8/api/videos'
 */
export function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith(`${BASE_PATH}/`)) {
    return cleanPath;
  }
  return `${BASE_PATH}${cleanPath}`;
}

/**
 * Fetch wrapper that automatically prefixes internal API paths with the application basePath.
 */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(input), init);
}
