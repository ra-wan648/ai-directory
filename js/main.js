/* Shared helpers */
const API = '';

function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch (e) {
    return '';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pricingBadge(pricing) {
  if (!pricing) return '';
  return `<span class="badge badge-${escapeHtml(pricing)}">${escapeHtml(pricing)}</span>`;
}

const CATEGORY_EMOJIS = {
  'Writing': '✍️', 'Coding': '💻', 'Image': '🎨', 'Video': '🎬',
  'Marketing': '📣', 'Productivity': '⚡', 'Research': '🔍', 'Audio': '🎵',
  'Chat': '💬', 'Business': '💼', 'Automation': '🤖', 'Analytics': '📊'
};

function categoryEmoji(category) {
  return CATEGORY_EMOJIS[category] || '🤖';
}

const CATEGORY_COLORS = {
  'Writing': '#22c55e', 'Coding': '#22c55e', 'Image': '#22c55e', 'Video': '#22c55e',
  'Marketing': '#22c55e', 'Productivity': '#22c55e', 'Research': '#22c55e', 'Audio': '#22c55e',
  'Chat': '#22c55e', 'Business': '#22c55e', 'Automation': '#22c55e', 'Analytics': '#22c55e'
};

function toolLogo(tool, size = 18) {
  const domain = getDomain(tool.url);
  const cat = tool.category || '';

  if (tool.logo_url) {
    return `<img class="tool-card-logo" style="width:${size}px;height:${size}px;" src="${escapeHtml(tool.logo_url)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
  }
  if (domain && domain.includes('huggingface.co')) {
    return `<span class="hf-badge">🤗 HF</span>`;
  }
  if (domain) {
    return `<img class="tool-card-logo" style="width:${size}px;height:${size}px;" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64" alt="" loading="lazy" onerror="this.style.display='none'">`;
  }
  const color = CATEGORY_COLORS[cat] || '#22c55e';
  return `<div class="logo-circle" style="width:${size * 1.4}px;height:${size * 1.4}px;font-size:${Math.round(size * 0.8)}px;background:${color}22;">${categoryEmoji(cat)}</div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function readTime(content) {
  const words = String(content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  return res.json();
}

/* Card renderer (shared) */
function renderToolCard(tool) {
  return `
    <div class="tool-card" data-slug="${escapeHtml(tool.slug)}" data-url="${escapeHtml(tool.url || '')}">
      <div class="tool-card-top">
        ${toolLogo(tool)}
        <span class="tool-card-name">${escapeHtml(tool.name)}</span>
        ${pricingBadge(tool.pricing)}
      </div>
      <div class="tool-card-cat">${categoryEmoji(tool.category)} ${escapeHtml(tool.category || '')}</div>
      <div class="tool-card-desc">${escapeHtml(tool.short_desc || tool.description || '')}</div>
      <div class="tool-card-visit">Visit ↗</div>
    </div>`;
}

function skeletonCard() {
  return `
    <div class="skeleton">
      <div class="skeleton-line l1"></div>
      <div class="skeleton-line l2"></div>
      <div class="skeleton-line l3"></div>
      <div class="skeleton-line l4"></div>
      <div class="skeleton-line l5"></div>
    </div>`;
}

/* ───────────────────────────
   INDEX PAGE LOGIC
─────────────────────────── */

(function initIndex() {
  if (!document.getElementById('toolGrid')) return;

  const state = {
    page: 1,
    filters: {},
    loading: false,
    hasMore: true
  };

  const toolGrid = document.getElementById('toolGrid');
  const sentinel = document.getElementById('sentinel');
  const emptyState = document.getElementById('emptyState');

  function updateURL() {
    const params = new URLSearchParams();
    const f = state.filters;
    if (f.category) params.set('category', f.category);
    if (f.pricing) params.set('pricing', f.pricing);
    if (f.tag) params.set('tag', f.tag);
    const qs = params.toString();
    history.pushState({}, '', qs ? '?' + qs : window.location.pathname);
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

      if (!append) {
        const total = data.total || 0;
        const loaded = page * 40;
        state.hasMore = loaded < total && tools.length > 0;
        if (!state.hasMore) sentinel.style.display = 'none';
        else sentinel.style.display = 'flex';
        if (tools.length === 0) emptyState.style.display = 'block';
      } else {
        toolGrid.querySelectorAll('.grid-load').forEach(el => el.remove());
        state.hasMore = tools.length === 40;
      }
      state.page = page;
      bindCardClicks();
    } catch (e) {
      if (!append) {
        toolGrid.innerHTML = '';
        emptyState.innerHTML = 'Failed to load tools. Refresh to try again.';
        emptyState.style.display = 'block';
      }
    }
    state.loading = false;
  }

  function bindCardClicks() {
    toolGrid.querySelectorAll('.tool-card').forEach(card => {
      card.onclick = () => {
        const slug = card.dataset.slug;
        if (slug) window.location.href = `tool.html?slug=${encodeURIComponent(slug)}`;
      };
    });
  }

  function applyFilter(key, val) {
    if (key === 'blog') {
      const blogTabs = document.querySelectorAll('[data-blog-tab]');
      blogTabs.forEach(t => t.classList.toggle('active', t.dataset.blogTab === val));
      fetchBlogs(val);
      return;
    }
    if (key === 'reset') {
      state.filters = {};
    } else if (val) {
      state.filters[key] = val;
    } else {
      delete state.filters[key];
    }

    document.querySelectorAll('.filter-pill').forEach(pill => {
      const isBlog = pill.hasAttribute('data-blog-tab');
      if (isBlog) return;
      const pillKey = pill.dataset.key;
      const pillVal = pill.dataset.val;
      const active = pillKey === 'reset'
        ? Object.keys(state.filters).length === 0
        : state.filters[pillKey] === pillVal;
      pill.classList.toggle('active', active);
    });
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const k = item.dataset.filterKey;
      const v = item.dataset.filterVal;
      item.classList.toggle('active', state.filters[k] === v);
    });
    updateURL();
    fetchTools(1, false);
  }

  /* Setup filter pills */
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      applyFilter(pill.dataset.key, pill.dataset.val);
    });
  });

  /* Setup sidebar filters */
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      applyFilter(item.dataset.filterKey, item.dataset.filterVal);
    });
  });

  /* Infinite scroll */
  function setupInfiniteScroll() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && state.hasMore && !state.loading) {
        fetchTools(state.page + 1, true);
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }

  /* Stats */
  async function fetchStats() {
    try {
      const data = await fetchJSON(`${API}/api/stats`);
      document.getElementById('statTools').textContent = data.total_tools || 0;
      document.getElementById('statCategories').textContent = data.total_categories || 0;
      document.getElementById('statToday').textContent = data.today_added || 0;
      document.getElementById('footerStats') && (document.getElementById('footerStats').innerHTML = `<strong>${data.total_tools || 0}</strong>+ tools · Updated every 6hrs`);
    } catch (e) {}
  }

  /* New today */
  async function fetchNewToday() {
    const strip = document.getElementById('newTodayStrip');
    try {
      const data = await fetchJSON(`${API}/api/tools/new`);
      const tools = data.tools || [];
      strip.innerHTML = '';
      if (tools.length === 0) strip.innerHTML = '<div class="empty-state" style="padding:10px;">No new tools today</div>';
      tools.forEach(t => {
        const domain = getDomain(t.url);
        const div = document.createElement('div');
        div.className = 'mini-card';
        const img = domain
          ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64" alt="" onerror="this.style.display='none'">`
          : `<span>${categoryEmoji(t.category)}</span>`;
        div.innerHTML = `${img}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">${escapeHtml(t.name)}</span>${pricingBadge(t.pricing)}`;
        div.onclick = () => window.location.href = `tool.html?slug=${encodeURIComponent(t.slug)}`;
        strip.appendChild(div);
      });
    } catch (e) {
      strip.innerHTML = '';
    }
  }

  /* Sidebar categories */
  async function fetchCategories() {
    const el = document.getElementById('sidebarCategories');
    try {
      const data = await fetchJSON(`${API}/api/categories`);
      const cats = data.categories || [];
      el.innerHTML = '';
      cats.forEach(c => {
        const name = c.name || c.category || '';
        const slug = (c.slug || name.toLowerCase().replace(/\s+/g, '-'));
        const count = c.tool_count || c.c || 0;
        const btn = document.createElement('button');
        btn.className = 'sidebar-item';
        btn.dataset.filterKey = 'category';
        btn.dataset.filterVal = slug;
        btn.innerHTML = `<span>${escapeHtml(c.icon || categoryEmoji(name))}</span><span class="cat-name">${escapeHtml(name)}</span><span class="count">${count}</span>`;
        btn.addEventListener('click', () => applyFilter('category', slug));
        el.appendChild(btn);
      });
    } catch (e) {
      el.innerHTML = '<div style="color:var(--text-3);font-size:12px;">Failed to load</div>';
    }
  }

  /* Sidebar prompts */
  async function fetchSidebarPrompts() {
    const el = document.getElementById('sidebarPrompts');
    try {
      const data = await fetchJSON(`${API}/api/prompts?limit=3`);
      const prompts = data.prompts || [];
      el.innerHTML = '';
      prompts.forEach(p => {
        const a = document.createElement('a');
        a.className = 'sidebar-prompt-title';
        a.href = `prompts.html?p=${encodeURIComponent(p.slug)}`;
        a.textContent = p.title;
        el.appendChild(a);
      });
      if (prompts.length === 0) el.innerHTML = '<div style="color:var(--text-3);font-size:12px;">No prompts yet</div>';
    } catch (e) {}
  }

  /* Prompt strip */
  async function fetchPrompts() {
    const strip = document.getElementById('promptStrip');
    try {
      const data = await fetchJSON(`${API}/api/prompts?limit=4`);
      const prompts = data.prompts || [];
      strip.innerHTML = '';
      if (prompts.length === 0) {
        strip.innerHTML = '<div class="empty-state" style="padding:20px;">No prompts yet</div>';
        return;
      }
      prompts.forEach(p => strip.insertAdjacentHTML('beforeend', renderPromptCard(p)));
      strip.querySelectorAll('[data-copy-prompt]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.copyPrompt;
          const text = btn.dataset.copyText;
          try { await navigator.clipboard.writeText(text); } catch (err) {}
          fetch(`${API}/api/prompts/copy/${id}`, { method: 'POST' }).catch(() => {});
          btn.classList.add('btn-copied');
          btn.textContent = '✅ Copied!';
          setTimeout(() => {
            btn.classList.remove('btn-copied');
            btn.innerHTML = '📋 COPY';
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

  /* Blog section */
  let currentBlogTab = 'review';
  async function fetchBlogs(category) {
    currentBlogTab = category || currentBlogTab;
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = '<div class="skeleton" style="height:140px;"></div>';
    try {
      const data = await fetchJSON(`${API}/api/blogs?category=${encodeURIComponent(currentBlogTab)}&limit=6`);
      const blogs = data.blogs || [];
      grid.innerHTML = '';
      if (blogs.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="padding:20px;">No posts yet</div>';
        return;
      }
      blogs.forEach(b => grid.insertAdjacentHTML('beforeend', renderBlogCard(b)));
      grid.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `post.html?slug=${encodeURIComponent(card.dataset.slug)}`;
        });
      });
    } catch (e) {
      grid.innerHTML = '';
    }
  }

  function renderBlogCard(b) {
    const catClass = ['review', 'tutorial', 'news'].includes(b.category) ? b.category : 'review';
    return `
      <div class="blog-card" data-slug="${escapeHtml(b.slug)}">
        <div class="blog-eyebrow ${catClass}">${escapeHtml(b.category)}</div>
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

  /* Subscribe */
  document.querySelectorAll('#subscribeBtn, [id="subscribeBtn"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const form = btn.closest('.subscribe-form-inline') || btn.closest('.subscribe-form');
      const input = form ? form.querySelector('input[type="email"]') : document.getElementById('subscribeEmail');
      const successEl = form ? form.nextElementSibling : document.getElementById('subscribeSuccess');
      if (!input) return;
      const email = input.value.trim();
      if (!email) { input.style.borderColor = '#f87171'; return; }
      try {
        await fetchJSON(`${API}/api/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        input.value = '';
        input.style.borderColor = '';
        if (successEl) { successEl.style.display = 'block'; setTimeout(() => { successEl.style.display = 'none'; }, 3000); }
        btn.textContent = '\u2713';
        setTimeout(() => { btn.textContent = '\u2192'; }, 2000);
      } catch (e) {
        btn.textContent = '!';
        setTimeout(() => { btn.textContent = '\u2192'; }, 2000);
      }
    });
  });

  /* Navbar scroll effect */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  });

  /* Mobile bottom sheet */
  const sheetToggle = document.getElementById('sheetToggle');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const bottomSheet = document.getElementById('bottomSheet');
  if (sheetToggle) {
    sheetToggle.addEventListener('click', () => {
      bottomSheet.innerHTML = document.getElementById('sidebar').innerHTML;
      bottomSheet.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
          applyFilter(item.dataset.filterKey, item.dataset.filterVal);
          closeSheet();
        });
      });
      bottomSheet.classList.add('open');
      sheetBackdrop.classList.add('open');
    });
    sheetBackdrop.addEventListener('click', closeSheet);
    function closeSheet() {
      bottomSheet.classList.remove('open');
      sheetBackdrop.classList.remove('open');
    }
  }

  /* Read filters from URL on load */
  function initFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) state.filters.category = params.get('category');
    if (params.get('pricing')) state.filters.pricing = params.get('pricing');
    if (params.get('tag')) state.filters.tag = params.get('tag');
  }

  /* Init */
  initFromURL();
  fetchStats();
  fetchNewToday();
  fetchCategories();
  fetchSidebarPrompts();
  fetchPrompts();
  fetchBlogs('review');
  fetchTools(1, false);
  setupInfiniteScroll();
})();
