/* ═══════════════════════════════════════════════════
   tool.js — tool detail page.
   Fetches /api/tools/:slug (worker.js contract).
   Depends on utils.js.
   ═══════════════════════════════════════════════════ */

(function initTool() {
  const slug = new URLSearchParams(location.search).get('slug');
  const nameEl = document.getElementById('tool-name');
  if (!nameEl) return;

  if (!slug) {
    nameEl.textContent = 'Missing tool';
    return;
  }

  async function load() {
    try {
      const data = await fetchJSON(`${API}/api/tools/${encodeURIComponent(slug)}`);
      populate(data.tool);
      setupTabs(data.tool);
      loadSidebar(data.tool);
      loadSimilar(data.tool, data.related);
    } catch (e) {
      nameEl.textContent = 'Tool not found';
      document.getElementById('tool-tagline').textContent = 'This tool may have been removed.';
    }
  }

  function populate(t) {
    nameEl.textContent = t.name;
    document.title = `${t.name} - AI Directory`;

    const favicon = document.getElementById('tool-favicon');
    favicon.src = faviconFor(t.url, 128);
    favicon.onerror = () => { favicon.style.visibility = 'hidden'; };

    const badge = document.getElementById('tool-pricing-badge');
    badge.textContent = t.pricing || 'free';
    badge.className = `pricing-badge ${pricingClass(t.pricing)}`;

    document.getElementById('tool-tagline').textContent = t.short_desc || t.description || '';

    const tags = String(t.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    document.getElementById('tool-tags').innerHTML = tags.map(tag =>
      `<span class="tool-tag">${escapeHtml(tag)}</span>`).join('');

    const visit = document.getElementById('btn-visit');
    visit.href = t.url || '#';

    if (t.screenshot_url) {
      const shot = document.getElementById('tool-screenshot');
      shot.src = t.screenshot_url;
      shot.hidden = false;
      document.getElementById('screenshot-placeholder').style.display = 'none';
    }

    const bcCat = document.getElementById('bc-cat');
    bcCat.textContent = t.category || 'Category';
    if (t.category) bcCat.href = `/category/${encodeURIComponent(t.category)}`;
    document.getElementById('bc-tool').textContent = t.name;

    /* Save (heart) button — localStorage backed */
    const saveBtn = document.getElementById('btn-save');
    const refreshSave = () => {
      const saved = isToolSaved(t.slug);
      saveBtn.classList.toggle('saved', saved);
      saveBtn.textContent = saved ? '❤ Saved' : '❤ Save';
    };
    refreshSave();
    saveBtn.addEventListener('click', () => {
      toggleSavedTool(t.slug);
      refreshSave();
    });
  }

  function setupTabs(t) {
    const bar = document.querySelector('.tab-bar');
    bar.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab, t);
    });
    renderTab('overview', t);
  }

  async function renderTab(tab, t) {
    const el = document.getElementById('tab-content');
    if (tab === 'overview') {
      el.innerHTML = `<div>${escapeHtml(t.description || t.short_desc || 'No description available.')}</div>`;
    } else if (tab === 'pricing') {
      if (t.pricing_detail) {
        el.innerHTML = `<div>${escapeHtml(t.pricing_detail)}</div>`;
      } else {
        const price = t.pricing || 'free';
        el.innerHTML = `<p>This tool is available on a <strong>${escapeHtml(price)}</strong> plan. Visit the official website for current pricing details.</p>`;
      }
    } else if (tab === 'features') {
      el.innerHTML = renderFeatures(t);
    } else if (tab === 'usecases') {
      el.innerHTML = `<p>Suitable for users looking to handle ${escapeHtml(t.category || 'various')} tasks. Try it out and see how it fits into your workflow.</p>`;
    } else if (tab === 'alternatives') {
      el.innerHTML = '<p>Loading alternatives...</p>';
      await renderAlternatives(t);
    } else if (tab === 'discussions') {
      el.innerHTML = `
        <h3>Discussions</h3>
        <p>Comments are not enabled for this tool yet. In the meantime, check out the reviews and alternatives above.</p>`;
    }
  }

  function renderFeatures(t) {
    let list = [];
    if (t.features) {
      try {
        const parsed = JSON.parse(t.features);
        if (Array.isArray(parsed)) {
          list = parsed.filter(Boolean).map(x => typeof x === 'object' ? Object.values(x)[0] : x);
        }
      } catch (e) {
        list = [];
      }
    }
    if (!list.length) {
      list = String(t.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!list.length) return '<p>No features listed.</p>';
    return `<ul>${list.map(f => `<li>${escapeHtml(String(f))}</li>`).join('')}</ul>`;
  }

  async function renderAlternatives(t) {
    const el = document.getElementById('tab-content');
    try {
      const data = await fetchJSON(`${API}/api/tools?category=${encodeURIComponent(t.category || '')}&limit=6`);
      const alts = (data.tools || []).filter(x => x.slug !== t.slug);
      if (!alts.length) {
        el.innerHTML = '<p>No alternatives found.</p>';
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'grid-3';
      alts.forEach(a => grid.insertAdjacentHTML('beforeend', renderToolCard(a)));
      bindCardClicks(grid);
      el.innerHTML = '';
      el.appendChild(grid);
    } catch (e) {
      el.innerHTML = '<p>Failed to load alternatives.</p>';
    }
  }

  async function loadSidebar(t) {
    const featuredEl = document.getElementById('featured-tools-list');
    try {
      const data = await fetchJSON(`${API}/api/tools/featured`);
      const tools = data.tools || [];
      featuredEl.innerHTML = tools.map(f => `
        <a class="featured-tool" href="/tool/${encodeURIComponent(f.slug)}">
          <img src="${faviconFor(f.url, 64)}" alt="" loading="lazy">
          <span>${escapeHtml(f.name)}</span>
        </a>`).join('') || '<p class="muted">None.</p>';
    } catch (e) {
      featuredEl.innerHTML = '<p class="muted">None.</p>';
    }

    const catsEl = document.getElementById('top-categories-pills');
    try {
      const data = await fetchJSON(`${API}/api/categories`);
      const top = (data.categories || []).slice(0, 8);
      catsEl.innerHTML = top.map(c => `
        <a class="top-cat-pill" href="/category/${encodeURIComponent(c.category)}">${escapeHtml(c.category)}</a>`).join('');
    } catch (e) {
      catsEl.innerHTML = '';
    }
  }

  function loadSimilar(t, related) {
    const el = document.getElementById('similar-tools');
    const sim = (related || []).filter(x => x.slug !== t.slug).slice(0, 3);
    if (!sim.length) {
      el.innerHTML = '<p class="muted">No similar tools.</p>';
      return;
    }
    el.innerHTML = sim.map(s => renderToolCard(s)).join('');
    bindCardClicks(el);
  }

  load();
})();
