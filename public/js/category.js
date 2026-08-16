const API = '';

const cat = new URLSearchParams(location.search).get('cat') || '';
let offset = 0;
let activeFilter = 'all';
let activeTab = 'recent';
let total = 0;

const CAT_EMOJI = {
  'AI Tools': '🤖', 'AI Assistant': '💬', 'Image': '🖼️', 'Chat': '💬',
  'Coding': '💻', 'Audio': '🎵', 'Video': '🎬', 'Open Source': '📦',
  'Automation': '⚡', 'Writing': '✍️', 'Marketing': '📣', 'Education': '📚',
  'Design': '🎨', 'Business': '💼', 'Productivity': '⚡', 'Research': '🔬',
  'Data': '📊', 'Security': '🔒'
};

function emojiFor(c) {
  return CAT_EMOJI[c] || '🛠️';
}

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

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('cat-name').textContent = cat;
  document.getElementById('cat-emoji').textContent = emojiFor(cat);
  document.title = `${cat} AI Tools - AI Directory`;

  try {
    const all = await fetchJSON(`${API}/api/categories`);
    const found = all.find(c => c.category === cat);
    document.getElementById('cat-count').textContent = `${found ? found.count : 0} tools`;
  } catch (e) {
    /* header count best-effort */
  }

  setupFilterPills();
  setupTabs();
  document.getElementById('load-more').addEventListener('click', () => {
    offset += 24;
    loadTools(true);
  });

  loadTools();
});

async function loadTools(append = false) {
  const grid = document.getElementById('tools-grid');
  const params = new URLSearchParams({ category: cat, limit: '24', offset: String(offset) });
  if (activeFilter !== 'all') params.set('filter', activeFilter);
  if (activeTab && activeTab !== 'recent') params.set('sort', activeTab);

  try {
    const data = await fetchJSON(`${API}/api/tools?${params.toString()}`);
    const tools = data.tools || [];
    total = data.total || 0;
    // Fix total for category page: reflect category-only total
    const markup = tools.map(renderToolCard).join('');
    if (append) grid.insertAdjacentHTML('beforeend', markup);
    else grid.innerHTML = markup;

    const loadMore = document.getElementById('load-more');
    loadMore.style.display = grid.children.length >= total ? 'none' : 'inline-block';
    if (!grid.children.length) grid.innerHTML = '<p class="muted">No tools found.</p>';
  } catch (e) {
    grid.innerHTML = '<p class="muted">Failed to load tools.</p>';
  }
}

function renderToolCard(tool) {
  const favicon = faviconFor(tool.url, 32);
  return `
    <div class="tool-card">
      <div class="tool-card-top">
        <img src="${favicon}" alt="" loading="lazy">
        <span class="tool-name" title="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</span>
      </div>
      <span class="pricing-badge ${pricingClass(tool.pricing)}">${escapeHtml(tool.pricing || 'free')}</span>
      <p class="tool-desc">${escapeHtml(tool.description || '')}</p>
      <div class="tool-card-footer">
        <a class="visit-link" href="/tool.html?slug=${encodeURIComponent(tool.slug)}">View →</a>
      </div>
    </div>
  `;
}

function setupFilterPills() {
  document.querySelectorAll('.filter-pills button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pills button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      offset = 0;
      loadTools();
    });
  });
}

function setupTabs() {
  document.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      offset = 0;
      loadTools();
    });
  });
}
