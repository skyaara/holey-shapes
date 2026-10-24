import { handleFromPath } from '../src/handle.js';

// /@handle serves the home page with link-preview tags for that handle, so a
// post on X shows the person's holey. The page itself fills in the rest.
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const handle = handleFromPath(url.pathname);
  if (!handle) return context.next();
  if (url.pathname !== `/@${handle}`) return Response.redirect(`${url.origin}/@${handle}${url.search}`, 301);

  const page = await context.env.ASSETS.fetch(new URL('/', url));
  const title = `@${handle}'s holey`;
  const description = `The holey made from @${handle}. Type a name, get a holey.`;
  const image = `${url.origin}/og/@${handle}.png`;
  const content = (value) => ({ element: (element) => element.setAttribute('content', value) });
  const response = new HTMLRewriter()
    .on('title', { element: (element) => element.setInnerContent(`${title} · holey-shapes`) })
    .on('meta[name="description"]', content(description))
    .on('meta[property="og:title"]', content(title))
    .on('meta[property="og:description"]', content(description))
    .on('meta[property="og:url"]', content(`${url.origin}/@${handle}`))
    .on('meta[property="og:image"]', content(image))
    .on('meta[property="og:image:alt"]', content(`${title}: a colorful shape with holes`))
    .on('meta[name="twitter:image"]', content(image))
    .on('link[rel="canonical"]', { element: (element) => element.setAttribute('href', `${url.origin}/@${handle}`) })
    .transform(page);
  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=300');
  return new Response(response.body, { status: 200, headers });
}
