// Share links use X-style handles: case-insensitive and written without the @,
// so @Ada, @ada and ada all lead to the same holey. Shared by the page and the
// Pages Functions that render link previews.
export const SITE = 'https://holey-shapes.aakashreddy.com';
const HANDLE = /^[a-z0-9_.-]{1,32}$/;

export const normalizeHandle = (value) => String(value ?? '').trim().replace(/^@+/, '').toLowerCase();
export const validHandle = (handle) => HANDLE.test(handle);

// "/@ada" → "ada". Anything that is not a valid handle gives "".
export function handleFromPath(pathname) {
  const match = /^\/@([^/]+)\/?$/.exec(pathname);
  if (!match) return '';
  let raw;
  try {
    raw = decodeURIComponent(match[1]);
  } catch {
    return '';
  }
  const handle = normalizeHandle(raw);
  return validHandle(handle) ? handle : '';
}

export const shareUrl = (handle, origin = SITE) => `${origin}/@${handle}`;
export const shareOnX = (handle, text, origin = SITE) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl(handle, origin))}`;
