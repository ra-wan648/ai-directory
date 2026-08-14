const WORKER_URL = 'https://ai-directory-worker.radwanislam648.workers.dev';

const PROXY_PREFIXES = ['/api/', '/og/'];
const PROXY_EXACT = ['/rss.xml', '/sitemap.xml', '/robots.txt'];
const PROXY_PREFIX_ANY = ['/telegram-webhook'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    let shouldProxy = PROXY_EXACT.includes(pathname);
    if (!shouldProxy) {
      for (const p of PROXY_PREFIXES) {
        if (pathname.startsWith(p)) {
          shouldProxy = true;
          break;
        }
      }
    }
    if (!shouldProxy) {
      for (const p of PROXY_PREFIX_ANY) {
        if (pathname.startsWith(p)) {
          shouldProxy = true;
          break;
        }
      }
    }

    if (shouldProxy) {
      const target = new URL(pathname + url.search, WORKER_URL);
      const headers = new Headers(request.headers);
      headers.delete('host');
      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: upstream.headers,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
