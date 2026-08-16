const API = '';
let activeFilter = 'all';
let compareList = [];

const CAT_EMOJI = {
  'AI Tools': '🤖',
  'AI Assistant': '💬',
  'Image': '🖼️',
  'Chat': '💬',
  'Coding': '💻',
  'Audio': '🎵',
  'Video': '🎬',
  'Open Source': '📦',
  'Automation': '⚡',
  'Writing': '✍️',
  'Marketing': '📣',
  'Education': '📚',
  'Design': '🎨',
  'Business': '💼',
  'Productivity': '⚡',
  'Research': '🔬',
  'Data': '📊',
  'Security': '🔒'
};

const TAB_META = [
  { label: 'Recent', filter: 'recent' },
  { label: 'Free', filter: 'free' },
  { label: 'Freemium', filter: 'freemium' },
  { label: 'Paid', filter: 'paid' },
  { label: 'Top Pick', filter: 'featured' }
];

function emojiFor(cat) {
  return CAT_EMOJI[cat] || '🛠️';
}

function faviconFor(url, size = 32) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch (e) {
    return '';
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function pricingClass(pricing) {
  const p = (pricing || '').toLowerCase();
  if (p.includes('paid')) return 'paid';
  if (p.includes('freemium')) return 'freemium';
  return 'free';
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadFreeTools();
  setupFilterPills();
  setupSearch();
  setupCompareBar();
  setupNewsletter();
});

/* ── Categories ─────────────────────────── */
async function loadCategories() {
  const container = document.getElementById('categories-container');
  let cats = [];
  try {
    cats = await fetchJSON(`${API}/api/categories`);
  } catch (e) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:24px">Failed to load categories.</p>';
    return;
  }
  cats.forEach(cat => renderCategorySection(cat, container));
  renderTrending(cats);
}

function renderCategorySection(cat, container) {
  const section = document.createElement('section');
  section.className = 'category-section';

  section.innerHTML = `
    <div class="category-header">
      <span class="category-emoji">${emojiFor(cat.category)}</span>
      <span class="category-name">${escapeHtml(cat.category)}</span>
      <span class="category-count">${cat.count}</span>
    </div>
    <div class="tabs-wrap">
      <div class="tab-bar">
        ${TAB_META.map((t, i) => `<button data-filter="${t.filter}" class="${i === 0 ? 'active' : ''}">${t.label}</button>`).join('')}
      </div>
      <a class="see-all" href="/category.html?cat=${encodeURIComponent(cat.category)}">See All →</a>
      <div class="grid-4"></div>
    </div>
  `;

  const gridEl = section.querySelector('.grid-4');
  const tabs = section.querySelector('.tab-bar');

  tabs.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadCategoryTools(cat.category, btn.dataset.filter, gridEl);
  });

  loadCategoryTools(cat.category, 'recent', gridEl);
  container.appendChild(section);
}

/* ── Category tools ─────────────────────── */
async function loadCategoryTools(category, filter, gridEl) {
  const applyFilter = filter === 'recent' || filter === 'top' || filter === 'all' ? '' : filter;
  const qs = new URLSearchParams({ category, limit: '24' });
  if (applyFilter) qs.set('filter', applyFilter);
  if (filter === 'featured') qs.set('filter', 'featured');

  let tools = [];
  try {
    const data = await fetchJSON(`${API}/api/tools?${qs.toString()}`);
    tools = data.tools || [];
  } catch (e) {
    gridEl.innerHTML = '<p style="color:var(--text-muted)">Failed to load tools.</p>';
    return;
  }

  gridEl.innerHTML = tools.map(renderToolCard).join('');
}

function renderToolCard(tool) {
  const inCompare = compareList.some(c => c.slug === tool.slug);
  const domain = (() => {
    try { return new URL(tool.url).hostname; } catch (e) { return '#'; }
  })();
  const favicon = faviconFor(tool.url, 32);
  const badge = pricingClass(tool.pricing);

  return `
    <div class="tool-card">
      <div class="tool-card-top">
        <img src="${favicon}" alt="" loading="lazy">
        <span class="tool-name" title="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</span>
      </div>
      <span class="pricing-badge ${badge}">${escapeHtml(tool.pricing || 'free')}</span>
      <p class="tool-desc">${escapeHtml(tool.description || tool.short_desc || '')}</p>
      <div class="tool-card-footer">
        <label class="compare-check">
          <input type="checkbox" data-slug="${escapeHtml(tool.slug)}" data-name="${escapeHtml(tool.name)}" ${inCompare ? 'checked' : ''}>
          Compare
        </label>
        <a class="visit-link" href="/tool.html?slug=${encodeURIComponent(tool.slug)}">Visit →</a>
      </div>
    </div>
  `;
}

/* ── Trending categories ────────────────── */
function renderTrending(cats) {
  const grid = document.getElementById('trending-categories');
  const top = cats.slice(0, 8);
  grid.innerHTML = top.map(c => `
    <a class="trend-card" href="/category.html?cat=${encodeURIComponent(c.category)}">
      <div class="emoji">${emojiFor(c.category)}</div>
      <div class="name">${escapeHtml(c.category)}</div>
      <div class="count">${c.count} tools</div>
    </a>
  `).join('');
}

/* ── Free tools (sidebar) ───────────────── */
async function loadFreeTools() {
  const list = document.getElementById('free-tools-list');
  let tools = [];
  try {
    const data = await fetchJSON(`${API}/api/free-tools`);
    tools = data.tools || [];
  } catch (e) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px">None available.</p>';
    return;
  }
  if (!tools.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px">None available.</p>';
    return;
  }
  list.innerHTML = tools.map(t => `
    <a href="/tool.html?slug=${encodeURIComponent(t.slug)}">
      <img src="${faviconFor(t.url, 16)}" alt="" loading="lazy">
      <span>${escapeHtml(t.name)}</span>
    </a>
  `).join('');
}

/* ── Filter pills ───────────────────────── */
function setupFilterPills() {
  document.querySelectorAll('.filter-pills button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pills button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      const container = document.getElementById('categories-container');
      container.querySelectorAll('.category-section').forEach(section => {
        section.remove();
      });
      loadCategories();
    });
  });
}

function getActiveFilterParam() {
  if (activeFilter === 'all') return '';
  return activeFilter;
}

/* ── Search ─────────────────────────────── */
function setupSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 3) {
      dropdown.classList.remove('visible');
      dropdown.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(async () => {
      let results = [];
      try {
        const data = await fetchJSON(`${API}/api/search?q=${encodeURIComponent(q)}`);
        results = data.results || [];
      } catch (e) {
        results = [];
      }
      dropdown.innerHTML = results.map(r => `
        <a href="/tool.html?slug=${encodeURIComponent(r.slug)}">
          <img src="${faviconFor(r.url, 26)}" alt="">
          <div>
            <div class="result-name">${escapeHtml(r.name)}</div>
            <div class="result-cat">${escapeHtml(r.category || '')}</div>
          </div>
        </a>
      `).join('') || '<div style="padding:12px;color:var(--text-muted);font-size:13px">No results</div>';
      dropdown.classList.add('visible');
    }, 300);
  });

  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && !e.target.closest('.search-bar')) {
      dropdown.classList.remove('visible');
    }
  });
}

/* ── Compare ────────────────────────────── */
function setupCompareBar() {
  document.getElementById('categories-container').addEventListener('change', e => {
    const box = e.target.closest('input[data-slug]');
    if (!box) return;
    toggleCompare(box.dataset.slug, box.dataset.name, box.checked);
  });

  document.getElementById('compare-btn').addEventListener('click', () => {
    if (compareList.length !== 2) return;
    window.location.href = `/compare.html?a=${encodeURIComponent(compareList[0].slug)}&b=${encodeURIComponent(compareList[1].slug)}`;
  });

  document.getElementById('compare-clear').addEventListener('click', clearCompare);
}

function toggleCompare(slug, name, checked) {
  if (checked) {
    if (compareList.length >= 2) {
      alert('You can compare up to 2 tools.');
      return;
    }
    if (!compareList.some(c => c.slug === slug)) {
      compareList.push({ slug, name });
    }
  } else {
    compareList = compareList.filter(c => c.slug !== slug);
  }
  updateCompareBar();
}

function updateCompareBar() {
  const bar = document.getElementById('compare-bar');
  const label = document.getElementById('compare-label');
  const btn = document.getElementById('compare-btn');

  if (compareList.length === 0) {
    bar.classList.remove('visible');
    btn.style.display = 'none';
  } else if (compareList.length === 1) {
    bar.classList.add('visible');
    label.textContent = `${compareList[0].name} — Select 1 more to compare`;
    btn.style.display = 'none';
  } else {
    bar.classList.add('visible');
    label.textContent = `${compareList[0].name} vs ${compareList[1].name}`;
    btn.style.display = 'inline-block';
  }
}

function clearCompare() {
  compareList = [];
  document.querySelectorAll('.compare-check input[data-slug]').forEach(cb => {
    cb.checked = false;
  });
  updateCompareBar();
}

/* ── Newsletter ─────────────────────────── */
function setupNewsletter() {
  const form = document.getElementById('newsletter-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.textContent = 'Subscribed ✓';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = 'Subscribe';
      btn.disabled = false;
      form.reset();
    }, 2500);
  });
}
