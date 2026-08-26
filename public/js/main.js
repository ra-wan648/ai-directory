/* ═══════════════════════════════════════════════════
   main.js — index page logic.
   Depends on utils.js (API, fetchJSON, renderToolCard, ...).
   ═══════════════════════════════════════════════════ */

(function initIndex() {
  const toolGrid = document.getElementById('toolGrid');
  const emptyState = document.getElementById('emptyState');
  const sentinel = document.getElementById('sentinel');

  if (!toolGrid) return;

  const state = {
    page: 1,
    filters: {},
    loading: false,
    hasMore: true
  };

  /* ── URL sync ── */
  function updateURL() {
    const params = new URLSearchParams();
    const f = state.filters;
    if (f.category) params.set('category', f.category);
    if (f.pricing) params.set('pricing', f.pricing);
    if (f.tag) params.set('tag', f.tag);
    const qs = params.toString();
    history.replaceState({}, '', qs ? '?' + qs : window.location.pathname);
  }

  function buildQuery(page) {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', '40');
    const f = state.filters;
    if (f.category) params.set('category', f.category);
    if (f.pricing) params.set('pricing', f.pricing);
    if (f.tag) params.set('tag', f.tag);
    return params.toString();
  }

  /* ── Tool grid + infinite scroll ── */
  async function fetchTools(page, append = false) {
    if (state.loading) return;
    state.loading = true;

    if (!append) {
      toolGrid.innerHTML = skeletonCard().repeat(8);
      emptyState.style.display = 'none';
    } else {
      const temp = document.createElement('div');
      temp.innerHTML = skeletonCard().repeat(4);
      const frag = document.createDocumentFragment();
      for (const child of temp.children) frag.appendChild(child);
      toolGrid.appendChild(frag);
    }

    try {
      const data = await fetchJSON(`${API}/api/tools?${buildQuery(page)}`);
      if (!append) toolGrid.innerHTML = '';
      const tools = data.tools || [];
      tools.forEach(t => toolGrid.insertAdjacentHTML('beforeend', renderToolCard(t)));
      bindCardClicks(toolGrid);

      const total = data.total || 0;
      const loaded = page * 40;
      state.hasMore = loaded < total && tools.length > 0;
      sentinel.style.display = state.hasMore ? 'flex' : 'none';
      if (tools.length === 0 && !append) emptyState.style.display = 'block';
      state.page = page;
    } catch (e) {
      if (!append) {
        toolGrid.innerHTML = '';
        emptyState.innerHTML = 'Failed to load tools. Refresh to try again.';
        emptyState.style.display = 'block';
      }
    }
    state.loading = false;
  }

  function setupInfiniteScroll() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && state.hasMore && !state.loading) {
        fetchTools(state.page + 1, true);
      }
    }, { rootMargin: '300px' });
    observer.observe(sentinel);
  }

  /* ── Filters ── */
  function applyFilter(key, val) {
    if (key === 'reset') state.filters = {};
    else if (val) state.filters[key] = val;
    else delete state.filters[key];

    document.querySelectorAll('.filter-row .filter-pill').forEach(pill => {
      const k = pill.dataset.key;
      const v = pill.dataset.val;
      const active = k === 'reset'
        ? Object.keys(state.filters).length === 0
        : state.filters[k] === v;
      pill.classList.toggle('active', active);
    });

    document.querySelectorAll('.sidebar-item[data-filter-key]').forEach(item => {
      item.classList.toggle('active', state.filters[item.dataset.filterKey] === item.dataset.filterVal);
    });

    updateURL();
    fetchTools(1, false);
  }

  document.querySelectorAll('.filter-row .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => applyFilter(pill.dataset.key, pill.dataset.val));
  });

  /* ── Sidebar: categories ── */
  async function fetchCategories() {
    const el = document.getElementById('sidebarCategories');
    try {
      const data = await fetchJSON(`${API}/api/categories`);
      const cats = data.categories || [];
      el.innerHTML = cats.map(c => `
        <a class="sidebar-item" href="/category/${encodeURIComponent(c.category)}">
          <span class="item-label"><span>${categoryEmoji(c.category)}</span><span>${escapeHtml(c.category)}</span></span>
          <span class="count">${c.tool_count || 0}</span>
        </a>`).join('') || '<div class="sidebar-header">No categories yet</div>';
    } catch (e) {
      el.innerHTML = '<div class="sidebar-header">Failed to load categories</div>';
    }
  }

  /* ── Sidebar: latest prompts ── */
  async function fetchSidebarPrompts() {
    const el = document.getElementById('sidebarPrompts');
    try {
      const data = await fetchJSON(`${API}/api/prompts?limit=3`);
      const prompts = data.prompts || [];
      el.innerHTML = prompts.map(p => `
        <a class="sidebar-prompt" href="/prompts">${escapeHtml(p.title)}</a>`).join('') ||
        '<div class="sidebar-header">No prompts yet</div>';
    } catch (e) {
      el.innerHTML = '';
    }
  }

  /* ── Stats ── */
  async function fetchStats() {
    try {
      const data = await fetchJSON(`${API}/api/stats`);
      document.getElementById('statTools').textContent = data.total_tools || 0;
      document.getElementById('statCategories').textContent = data.total_categories || 0;
      document.getElementById('statToday').textContent = data.today_added || 0;
    } catch (e) { /* best-effort */ }
  }

  /* ── New today strip ── */
  async function fetchNewToday() {
    const strip = document.getElementById('newTodayStrip');
    try {
      const data = await fetchJSON(`${API}/api/tools/new`);
      const tools = data.tools || [];
      strip.innerHTML = '';
      if (!tools.length) {
        strip.innerHTML = '<div class="empty-state" style="padding:14px;">No new tools today</div>';
        return;
      }
      tools.forEach(t => {
        const domain = getDomain(t.url);
        const div = document.createElement('div');
        div.className = 'mini-card';
        const img = domain
          ? `<img src="${faviconFor(t.url, 64)}" alt="" onerror="this.style.display='none'">`
          : `<span style="font-size:16px">${categoryEmoji(t.category)}</span>`;
        div.innerHTML = `${img}<span class="mini-name">${escapeHtml(t.name)}</span>${pricingBadge(t.pricing)}`;
        div.addEventListener('click', () => {
          window.location.href = `/tool/${encodeURIComponent(t.slug)}`;
        });
        strip.appendChild(div);
      });
    } catch (e) {
      strip.innerHTML = '';
    }
  }

  /* ── Prompt strip ── */
  async function fetchPrompts() {
    const strip = document.getElementById('promptStrip');
    try {
      const data = await fetchJSON(`${API}/api/prompts?limit=4`);
      const prompts = data.prompts || [];
      strip.innerHTML = '';
      if (!prompts.length) {
        strip.innerHTML = '<div class="empty-state" style="padding:20px;">No prompts yet</div>';
        return;
      }
      prompts.forEach(p => strip.insertAdjacentHTML('beforeend', renderPromptCard(p)));
      strip.querySelectorAll('[data-copy-prompt]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.copyPrompt;
          const text = btn.dataset.copyText;
          try { await navigator.clipboard.writeText(text); } catch (err) { /* noop */ }
          fetch(`${API}/api/prompts/copy/${id}`, { method: 'POST' }).catch(() => {});
          btn.classList.add('btn-copied');
          btn.textContent = '✅ Copied!';
          setTimeout(() => {
            btn.classList.remove('btn-copied');
            btn.textContent = '📋 COPY';
          }, 2000);
        });
      });
    } catch (e) {
      strip.innerHTML = '';
    }
  }

  function renderPromptCard(p) {
    const tools = String(p.compatible_tools || '').split(',').map(t => t.trim()).filter(Boolean);
    const badges = tools.map(t => `<span class="compat-badge">${escapeHtml(t.toUpperCase())}</span>`).join('');
    return `
      <div class="prompt-card">
        <div class="prompt-eyebrow">${escapeHtml(p.category || 'prompt')}</div>
        <div class="prompt-title">${escapeHtml(p.title)}</div>
        <div class="prompt-desc">${escapeHtml(p.description || '')}</div>
        <div class="compat-badges">${badges}</div>
        <div class="prompt-actions">
          <button class="btn btn-accent btn-sm" data-copy-prompt="${p.id}" data-copy-text="${escapeHtml(p.prompt_text || '')}">📋 COPY</button>
        </div>
      </div>`;
  }

  /* ── Blog section ── */
  async function fetchBlogs(category) {
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = '<div class="skeleton" style="height:150px;"></div>';
    try {
      const data = await fetchJSON(`${API}/api/blogs?category=${encodeURIComponent(category)}&limit=6`);
      const blogs = data.blogs || [];
      grid.innerHTML = '';
      if (!blogs.length) {
        grid.innerHTML = '<div class="empty-state" style="padding:20px;">No posts yet</div>';
        return;
      }
      blogs.forEach(b => grid.insertAdjacentHTML('beforeend', renderBlogCard(b)));
      grid.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `/post/${encodeURIComponent(card.dataset.slug)}`;
        });
      });
    } catch (e) {
      grid.innerHTML = '';
    }
  }

  function renderBlogCard(b) {
    return `
      <div class="blog-card" data-slug="${escapeHtml(b.slug)}">
        <div class="blog-eyebrow ${escapeHtml(b.category)}">${escapeHtml(b.category)}</div>
        <div class="blog-title">${escapeHtml(b.title)}</div>
        <div class="blog-meta">${formatDate(b.published_at)} · ${readTime(b.content)} min read</div>
      </div>`;
  }

  document.querySelectorAll('[data-blog-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-blog-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      fetchBlogs(tab.dataset.blogTab);
    });
  });

  /* ── Mobile bottom sheet ── */
  const sheetToggle = document.getElementById('sheetToggle');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const bottomSheet = document.getElementById('bottomSheet');
  function closeSheet() {
    bottomSheet.classList.remove('open');
    sheetBackdrop.classList.remove('open');
  }
  if (sheetToggle) {
    sheetToggle.addEventListener('click', () => {
      bottomSheet.innerHTML = document.getElementById('sidebar').innerHTML;
      bottomSheet.querySelectorAll('.sidebar-item[data-filter-key]').forEach(item => {
        item.addEventListener('click', () => {
          applyFilter(item.dataset.filterKey, item.dataset.filterVal);
          closeSheet();
        });
      });
      bottomSheet.classList.add('open');
      sheetBackdrop.classList.add('open');
    });
    sheetBackdrop.addEventListener('click', closeSheet);
  }

  /* ── Navbar scroll effect ── */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  });

  /* ── Init ── */
  const params = new URLSearchParams(window.location.search);
  if (params.get('category')) state.filters.category = params.get('category');
  if (params.get('pricing')) state.filters.pricing = params.get('pricing');
  if (params.get('tag')) state.filters.tag = params.get('tag');

  if (Object.keys(state.filters).length) {
    document.querySelectorAll('.filter-row .filter-pill').forEach(pill => {
      const active = state.filters[pill.dataset.key] === pill.dataset.val;
      pill.classList.toggle('active', active);
    });
    document.querySelectorAll('.sidebar-item[data-filter-key]').forEach(item => {
      item.classList.toggle('active', state.filters[item.dataset.filterKey] === item.dataset.filterVal);
    });
  }

  fetchStats();
  fetchNewToday();
  fetchCategories();
  fetchSidebarPrompts();
  fetchPrompts();
  fetchBlogs('review');
  fetchTools(1, false);
  setupInfiniteScroll();
  setupNewsletter();
})();
