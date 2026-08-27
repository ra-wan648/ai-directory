/* ═══════════════════════════════════════════════════
   utils.js — shared helpers for all pages.
   Loaded before page-specific scripts.
   ═══════════════════════════════════════════════════ */

const API = 'https://ai-directory-worker.radwanislam648.workers.dev';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

function faviconFor(url, size = 32) {
  const domain = getDomain(url);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

function pricingClass(pricing) {
  const p = String(pricing || '').toLowerCase();
  if (p.includes('paid')) return 'paid';
  if (p.includes('freemium')) return 'freemium';
  return 'free';
}

function pricingBadge(pricing) {
  if (!pricing) return '';
  return `<span class="badge badge-${pricingClass(pricing)}">${escapeHtml(pricing)}</span>`;
}

const CATEGORY_EMOJIS = {
  'Writing': '✍️',
  'Coding': '💻',
  'Image': '🎨',
  'Video': '🎬',
  'Marketing': '📣',
  'Productivity': '⚡',
  'Research': '🔬',
  'Audio': '🎵',
  'Chat': '💬',
  'Business': '💼',
  'Automation': '🤖',
  'Analytics': '📊',
  'AI Assistant': '💬',
  'Open Source': '📦',
  'Design': '🎨',
  'Education': '📚',
  'Data': '📊',
  'Security': '🔒'
};

function categoryEmoji(category) {
  return CATEGORY_EMOJIS[category] || '🤖';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function readTime(content) {
  const words = String(content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
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

function toolLogo(tool, size = 34) {
  const domain = getDomain(tool.url);
  if (tool.logo_url) {
    return `<img class="tool-card-logo" style="width:${size}px;height:${size}px" src="${escapeHtml(tool.logo_url)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
  }
  if (domain) {
    return `<img class="tool-card-logo" style="width:${size}px;height:${size}px" src="${faviconFor(tool.url, 64)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
  }
  return `<div class="logo-circle" style="width:${size}px;height:${size}px;font-size:${Math.max(13, Math.round(size * 0.55))}px">${categoryEmoji(tool.category)}</div>`;
}

function renderToolCard(tool) {
  return `
    <div class="tool-card" data-slug="${escapeHtml(tool.slug)}">
      <div class="tool-card-top">
        ${toolLogo(tool)}
        <span class="tool-card-name" title="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</span>
        ${pricingBadge(tool.pricing)}
      </div>
      <div class="tool-card-cat">${categoryEmoji(tool.category)} ${escapeHtml(tool.category || '')}</div>
      <div class="tool-card-desc">${escapeHtml(tool.short_desc || tool.description || 'No description.')}</div>
      <div class="tool-card-bottom">
        <span class="tool-card-visit">Visit ↗</span>
      </div>
    </div>`;
}

function bindCardClicks(container, selector = '.tool-card') {
  container.querySelectorAll(selector).forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.dataset.slug;
      if (slug) window.location.href = `/tool/${encodeURIComponent(slug)}`;
    });
  });
}

/* Wire up every [data-subscribe] button on the page to /api/subscribe. */
function setupNewsletter() {
  document.querySelectorAll('[data-subscribe]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wrap = btn.closest('.newsletter-wrap');
      const input = wrap ? wrap.querySelector('input[type="email"]') : null;
      const status = wrap ? wrap.querySelector('.subscribe-status') : null;
      if (!input) return;
      const email = input.value.trim();
      input.classList.remove('invalid');
      if (status) status.classList.remove('show', 'error');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.classList.add('invalid');
        return;
      }
      btn.disabled = true;
      btn.textContent = '…';
      try {
        await fetchJSON(`${API}/api/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        input.value = '';
        if (status) {
          status.textContent = "You're in! ✓";
          status.classList.add('show');
          setTimeout(() => { status.classList.remove('show'); }, 3500);
        }
      } catch (e) {
        if (status) {
          status.textContent = 'Subscription failed. Try again.';
          status.classList.add('show', 'error');
          setTimeout(() => { status.classList.remove('show', 'error'); }, 3500);
        }
      }
      btn.disabled = false;
      btn.textContent = '→';
    });
  });
}

/* Persist saved tools (heart button) in localStorage. */
function toggleSavedTool(slug) {
  const key = 'savedTools';
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { saved = []; }
  const i = saved.indexOf(slug);
  if (i >= 0) saved.splice(i, 1);
  else saved.push(slug);
  localStorage.setItem(key, JSON.stringify(saved));
  return saved;
}

function isToolSaved(slug) {
  try {
    return (JSON.parse(localStorage.getItem('savedTools')) || []).includes(slug);
  } catch (e) {
    return false;
  }
}
