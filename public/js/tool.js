const API = '';

const slug = new URLSearchParams(location.search).get('slug');
let tool = null;
let comments = [];

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function faviconFor(url, size = 32) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch (e) {
    return '';
  }
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function pricingClass(pricing) {
  const p = (pricing || '').toLowerCase();
  if (p.includes('paid')) return 'paid';
  if (p.includes('freemium')) return 'freemium';
  return 'free';
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!slug) {
    document.getElementById('tool-name').textContent = 'Missing slug';
    return;
  }
  try {
    const data = await fetchJSON(`${API}/api/tool/${encodeURIComponent(slug)}`);
    tool = data.tool;
    comments = data.comments || [];
  } catch (e) {
    document.getElementById('tool-name').textContent = 'Tool not found';
    return;
  }
  populate(tool);
  setupTabs(tool);
  loadSidebar(tool);
  loadSimilar(tool);
});

function populate(t) {
  document.getElementById('tool-favicon').src = faviconFor(t.url, 48);
  document.getElementById('tool-name').textContent = t.name;
  document.title = `${t.name} - AI Directory`;

  const badge = document.getElementById('tool-pricing-badge');
  badge.textContent = t.pricing || 'free';
  badge.className = `pricing-badge ${pricingClass(t.pricing)}`;

  document.getElementById('tool-tagline').textContent = t.short_desc || t.description || '';

  const visit = document.getElementById('btn-visit');
  visit.href = t.visit_url || t.url || '#';

  if (t.screenshot_url) {
    document.getElementById('tool-screenshot').src = t.screenshot_url;
    document.getElementById('tool-screenshot').hidden = false;
    document.getElementById('screenshot-placeholder').style.display = 'none';
  } else {
    document.getElementById('tool-screenshot').hidden = true;
    document.getElementById('screenshot-placeholder').style.display = 'flex';
  }

  document.getElementById('bc-cat').textContent = t.category || 'Category';
  if (t.category) {
    document.getElementById('bc-cat').href = `/category.html?cat=${encodeURIComponent(t.category)}`;
  }
  document.getElementById('bc-tool').textContent = t.name;

  document.getElementById('btn-save').addEventListener('click', function () {
    this.classList.toggle('saved');
    this.textContent = this.classList.contains('saved') ? '❤ Saved' : '❤ Save';
  });
}

function setupTabs(t) {
  document.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab, t);
    });
  });
  renderTab('overview', t);
}

async function renderTab(tab, t) {
  const el = document.getElementById('tab-content');
  if (tab === 'overview') {
    el.innerHTML = `<div>${escapeHtml(t.description_full || t.description || 'No description.')}</div>`;
  } else if (tab === 'pricing') {
    el.innerHTML = `<div>${escapeHtml(t.pricing_detail || t.pricing || 'No pricing details.')}</div>`;
  } else if (tab === 'features') {
    el.innerHTML = renderFeatures(t.features);
  } else if (tab === 'usecases') {
    el.innerHTML = `<p>Suitable for users looking to handle ${escapeHtml(t.category || 'various')} tasks.</p>`;
  } else if (tab === 'alternatives') {
    el.innerHTML = '<p>Loading alternatives...</p>';
    await renderAlternatives(t);
  } else if (tab === 'discussions') {
    el.innerHTML = renderDiscussions(t);
    setupCommentForm(t);
  }
}

function renderFeatures(features) {
  if (!features) return '<p>No features listed.</p>';
  let list = [];
  try {
    const parsed = JSON.parse(features);
    if (Array.isArray(parsed)) {
      list = parsed.filter(x => x).map(x => typeof x === 'object' ? Object.values(x)[0] : x);
    }
  } catch (e) {
    list = [features];
  }
  if (!list.length) return '<p>No features listed.</p>';
  return `<ul>${list.map(f => `<li>${escapeHtml(String(f))}</li>`).join('')}</ul>`;
}

async function renderAlternatives(t) {
  const el = document.getElementById('tab-content');
  try {
    const data = await fetchJSON(`${API}/api/tools?category=${encodeURIComponent(t.category)}&limit=6`);
    const alts = (data.tools || []).filter(x => x.slug !== t.slug);
    if (!alts.length) {
      el.innerHTML = '<p>No alternatives found.</p>';
      return;
    }
    el.innerHTML = `
      <div class="grid-3">
        ${alts.map(a => `
          <div class="tool-card">
            <div class="tool-card-top">
              <img src="${faviconFor(a.url, 32)}" alt="" loading="lazy">
              <span class="tool-name">${escapeHtml(a.name)}</span>
            </div>
            <span class="pricing-badge ${pricingClass(a.pricing)}">${escapeHtml(a.pricing || 'free')}</span>
            <p class="tool-desc">${escapeHtml(a.description || '')}</p>
            <div class="tool-card-footer">
              <a class="visit-link" href="/tool.html?slug=${encodeURIComponent(a.slug)}">View →</a>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<p>Failed to load alternatives.</p>';
  }
}

function renderDiscussions(t) {
  const items = (comments || []).map(c => `
    <div class="comment-item">
      <div class="author">${escapeHtml(c.name)}</div>
      <div class="body">${escapeHtml(c.comment)}</div>
      <div class="time">${escapeHtml(c.created_at || '')}</div>
    </div>
  `).join('');

  return `
    <h3>Discussions</h3>
    <form id="comment-form" class="comment-form">
      <input type="text" id="comment-name" placeholder="Your name" required>
      <textarea id="comment-text" placeholder="Share your thoughts..." required></textarea>
      <button class="btn-primary" type="submit">Submit</button>
    </form>
    <div id="comments-list">
      ${items || '<p class="muted">No comments yet. Be the first!</p>'}
    </div>
  `;
}

function setupCommentForm(t) {
  const form = document.getElementById('comment-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('comment-name').value.trim();
    const comment = document.getElementById('comment-text').value.trim();
    if (!name || !comment) return;
    try {
      await fetchJSON(`${API}/api/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_slug: t.slug, name, comment })
      });
      form.reset();
      const data = await fetchJSON(`${API}/api/comments/${encodeURIComponent(t.slug)}`);
      comments = data.comments || [];
      renderTab('discussions', t);
    } catch (err) {
      alert('Failed to post comment.');
    }
  });
}

async function loadSidebar(t) {
  try {
    const feat = await fetchJSON(`${API}/api/tools?filter=featured&limit=4`);
    document.getElementById('featured-tools-list').innerHTML = (feat.tools || []).map(f => `
      <a class="featured-tool" href="/tool.html?slug=${encodeURIComponent(f.slug)}">
        <img src="${faviconFor(f.url, 24)}" alt="" loading="lazy">
        <span>${escapeHtml(f.name)}</span>
      </a>
    `).join('');
  } catch (e) {
    document.getElementById('featured-tools-list').innerHTML = '<p class="muted">None.</p>';
  }

  try {
    const cats = await fetchJSON(`${API}/api/categories`);
    const top = cats.slice(0, 8);
    document.getElementById('top-categories-pills').innerHTML = top.map(c => `
      <a class="top-cat-pill" href="/category.html?cat=${encodeURIComponent(c.category)}">${escapeHtml(c.category)}</a>
    `).join('');
  } catch (e) {
    /* noop */
  }
}

async function loadSimilar(t) {
  const el = document.getElementById('similar-tools');
  try {
    const data = await fetchJSON(`${API}/api/tools?category=${encodeURIComponent(t.category)}&limit=6`);
    const sim = (data.tools || []).filter(x => x.slug !== t.slug).slice(0, 3);
    if (!sim.length) {
      el.innerHTML = '<p class="muted">No similar tools.</p>';
      return;
    }
    el.innerHTML = sim.map(s => `
      <div class="tool-card">
        <div class="tool-card-top">
          <img src="${faviconFor(s.url, 32)}" alt="" loading="lazy">
          <span class="tool-name">${escapeHtml(s.name)}</span>
        </div>
        <span class="pricing-badge ${pricingClass(s.pricing)}">${escapeHtml(s.pricing || 'free')}</span>
        <p class="tool-desc">${escapeHtml(s.description || '')}</p>
        <div class="tool-card-footer">
          <a class="visit-link" href="/tool.html?slug=${encodeURIComponent(s.slug)}">View →</a>
        </div>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = '<p class="muted">Failed to load similar tools.</p>';
  }
}
