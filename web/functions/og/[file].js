import { handleFromPath } from '../../src/handle.js';
import { CARD_VERSION, renderCard } from '../../server/card.js';

// /og/@handle.png: the preview card for a share link. Cards are deterministic,
// so each one is rendered once and then served from the edge cache.
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const match = /^\/og\/@([^/]+)\.png$/.exec(url.pathname);
  const handle = match ? handleFromPath(`/@${match[1]}`) : '';
  if (!handle) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const key = new Request(`${url.origin}/og/@${handle}.png?v=${CARD_VERSION}`);
  const cached = await cache.match(key);
  if (cached) return cached;
  const response = new Response(await renderCard(handle), {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400, s-maxage=604800' },
  });
  context.waitUntil(cache.put(key, response.clone()));
  return response;
}
