const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
}

function faviconFor(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch (e) {
    return '';
  }
}

const TOOL_FIELDS = ['id', 'name', 'slug', 'url', 'description', 'category', 'pricing', 'tags', 'screenshot_url', 'is_free_tool'];

async function getToolBySlug(env, slug) {
  return env.DB.prepare(`SELECT * FROM tools WHERE slug = ? AND status = 'published'`).bind(slug).first();
}

async function getTools(env, params) {
  const category = params.get('category');
  const filter = params.get('filter');
  const sort = params.get('sort');
  const limit = Math.min(parseInt(params.get('limit') || '24', 10) || 24, 100);
  const offset = parseInt(params.get('offset') || '0', 10) || 0;

  let where = ["status = 'published'"];
  let order = 'id DESC';

  if (category) where.push(`category = '${String(category).replace(/'/g, "''")}'`);

  if (filter) {
    if (filter === 'free') where.push("pricing LIKE '%free%'");
    else if (filter === 'freemium') where.push("pricing LIKE '%freemium%'");
    else if (filter === 'paid') where.push("pricing LIKE '%paid%' AND pricing NOT LIKE '%free%'");
    else if (filter === 'new') order = 'created_at DESC';
    else if (filter === 'featured' || filter === 'trending') order = 'id DESC';
    else if (filter === 'open-source') where.push("tags LIKE '%open-source%'");
  }

  if (sort === 'views') order = 'views DESC';
  else if (sort === 'name') order = 'name ASC';
  else if (sort === 'votes') order = 'votes DESC';

  const whereSql = where.join(' AND ');
  const { results } = await env.DB.prepare(
    `SELECT id,name,slug,url,description,category,pricing,tags,screenshot_url,is_free_tool FROM tools WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  const { results: total } = await env.DB.prepare(`SELECT COUNT(*) as c FROM tools WHERE ${whereSql}`).all();
  const rows = results.map(r => ({ ...r, favicon_url: faviconFor(r.url), short_desc: (r.description || '').slice(0, 160) }));
  return { tools: rows, total: total[0].c, limit, offset };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
    }

    const db = env.DB;

    try {
      // GET /api/tools
      if (pathname === '/api/tools' && method === 'GET') {
        return json(await getTools(env, url.searchParams));
      }

      // GET /api/tool/:slug
      let match = pathname.match(/^\/api\/tool\/([^/]+)$/);
      if (match && method === 'GET') {
        const tool = await getToolBySlug(env, match[1]);
        if (!tool) return json({ error: 'not found' }, 404);
        const { results: comments } = await env.DB.prepare('SELECT * FROM comments WHERE tool_slug = ? ORDER BY created_at DESC').bind(match[1]).all();
        return json({ tool, comments });
      }

      // GET /api/categories
      if (pathname === '/api/categories' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT category, COUNT(*) as count FROM tools WHERE status='published' GROUP BY category ORDER BY count DESC`
        ).all();
        return json(results);
      }

      // GET /api/search?q=
      if (pathname === '/api/search' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').trim();
        if (!q) return json({ results: [] });
        const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;
        const { results } = await env.DB.prepare(
          `SELECT id,name,slug,url,description,category,pricing,tags,screenshot_url,is_free_tool
           FROM tools WHERE status='published' AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\') LIMIT 20`
        ).bind(like, like).all();
        return json({ results: results.map(r => ({ ...r, favicon_url: faviconFor(r.url) })) });
      }

      // GET /api/compare?a=&b=
      if (pathname === '/api/compare' && method === 'GET') {
        const a = await getToolBySlug(env, url.searchParams.get('a') || '');
        const b = await getToolBySlug(env, url.searchParams.get('b') || '');
        return json({ toolA: a || null, toolB: b || null });
      }

      // GET /api/free-tools
      if (pathname === '/api/free-tools' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id,name,slug,url,description,category,pricing,tags,screenshot_url,is_free_tool FROM tools WHERE is_free_tool=1 LIMIT 100`
        ).all();
        return json({ tools: results.map(r => ({ ...r, favicon_url: faviconFor(r.url) })) });
      }

      // POST /api/comment
      if (pathname === '/api/comment' && method === 'POST') {
        let body;
        try { body = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400); }
        const tool_slug = (body.tool_slug || '').trim();
        const name = (body.name || '').trim();
        const comment = (body.comment || '').trim();
        if (!tool_slug || !name || !comment) return json({ error: 'tool_slug, name, comment required' }, 400);
        const tool = await getToolBySlug(env, tool_slug);
        if (!tool) return json({ error: 'tool not found' }, 404);
        const stmt = await env.DB.prepare('INSERT INTO comments (tool_slug, name, comment) VALUES (?,?,?)')
          .bind(tool_slug, name, comment).run();
        return json({ success: true, id: stmt.meta.last_row_id });
      }

      // GET /api/comments/:slug
      match = pathname.match(/^\/api\/comments\/([^/]+)$/);
      if (match && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM comments WHERE tool_slug = ? ORDER BY created_at DESC').bind(match[1]).all();
        return json({ comments: results });
      }

      // Serve static assets from Pages
      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },
};
