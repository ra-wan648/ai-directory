/* ═══════════════════════════════════════════════════
   category.js — category listing page.
   Uses page-based pagination (worker.js /api/tools).
   Depends on utils.js.
   ═══════════════════════════════════════════════════ */

(function initCategory() {
  const cat = new URLSearchParams(location.search).get('cat') || '';
  const grid = document.getElementById('tools-grid');
  if (!grid) return;

  const state = {
    page: 1,
    filter: 'all',
    tab: 'recent',
    total: 0
  };

  const nameEl = document.getElementById('cat-name');
  const emojiEl = document.getElementById('cat-emoji');
  const countEl = document.getElementById('cat-count');
  const loadMore = document.getElementById('load-more');

  nameEl.textContent = cat || 'All Tools';
  emojiEl.textContent = categoryEmoji(cat);
  document.title = `${cat || 'All Tools'} AI Tools - AI Directory`;

  async function loadToolCount() {
    try {
      const data = await fetchJSON(`${API}/api/categories`);
      const found = (data.categories || []).find(c => c.category === cat);
      countEl.textContent = `${found ? found.tool_count : 0} tools`;
    } catch (e) { /* best-effort */ }
  }

  function buildQuery(page) {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', '24');
    if (cat) params.set('category', cat);

    if (state.filter === 'free' || state.filter === 'freemium' || state.filter === 'paid') {
      params.set('pricing', state.filter);
    } else if (state.filter === 'new') {
      params.set('tag', 'new');
    }

    if (state.tab === 'new') params.set('tag', 'new');
    else if (state.tab === 'views') params.set('sort', 'views');

    return params.toString();
  }

  async function loadTools(append = false) {
    if (!append) grid.innerHTML = skeletonCard().repeat(8);
    try {
      const data = await fetchJSON(`${API}/api/tools?${buildQuery(state.page)}`);
      const tools = data.tools || [];
      state.total = data.total || 0;
      if (append) grid.insertAdjacentHTML('beforeend', tools.map(renderToolCard).join(''));
      else grid.innerHTML = tools.map(renderToolCard).join('');

      bindCardClicks(grid);

      const loaded = grid.querySelectorAll('.tool-card').length;
      loadMore.style.display = (loaded >= state.total || tools.length === 0) ? 'none' : 'inline-block';
      if (!tools.length && !append) {
        grid.innerHTML = '<p class="muted" style="padding:24px;">No tools found.</p>';
      }
    } catch (e) {
      if (!append) grid.innerHTML = '<p class="muted" style="padding:24px;">Failed to load tools.</p>';
    }
  }

  /* Filter pills */
  document.querySelectorAll('#catFilters .filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#catFilters .filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      state.page = 1;
      loadTools(false);
    });
  });

  /* Tabs */
  document.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tab = btn.dataset.tab;
      state.page = 1;
      loadTools(false);
    });
  });

  loadMore.addEventListener('click', () => {
    state.page += 1;
    loadTools(true);
  });

  loadToolCount();
  loadTools(false);
  setupNewsletter();
})();
