/* Tool detail page */

const CATEGORY_EMOJIS = {
  'Writing': '✍️', 'Coding': '💻', 'Image': '🎨', 'Video': '🎬',
  'Marketing': '📣', 'Productivity': '⚡', 'Research': '🔍', 'Audio': '🎵',
  'Chat': '💬', 'Business': '💼', 'Automation': '🤖', 'Analytics': '📊'
};

const CATEGORY_COLORS = {
  'Writing': '#22c55e', 'Coding': '#22c55e', 'Image': '#22c55e', 'Video': '#22c55e',
  'Marketing': '#22c55e', 'Productivity': '#22c55e', 'Research': '#22c55e', 'Audio': '#22c55e',
  'Chat': '#22c55e', 'Business': '#22c55e', 'Automation': '#22c55e', 'Analytics': '#22c55e'
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

function pricingBadge(pricing) {
  if (!pricing) return '';
  return `<span class="badge badge-${escapeHtml(pricing)}">${escapeHtml(pricing)}</span>`;
}

function categoryEmoji(cat) {
  return CATEGORY_EMOJIS[cat] || '🤖';
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

function toolLogo(tool, size = 48) {
  const domain = getDomain(tool.url);
  if (tool.logo_url) {
    return `<img src="${escapeHtml(tool.logo_url)}" alt="" style="width:${size}px;height:${size}px;border-radius:8px;object-fit:contain;" onerror="this.style.display='none'">`;
  }
  if (domain && domain.includes('huggingface.co')) {
    return `<div style="width:${size}px;height:${size}px;background:var(--bg-hover);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;">🤗 HF</div>`;
  }
  if (domain) {
    return `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128" alt="" style="width:${size}px;height:${size}px;border-radius:8px;" onerror="this.style.display='none'">`;
  }
  const color = CATEGORY_COLORS[tool.category] || '#22c55e';
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}22;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.5)}px;">${categoryEmoji(tool.category)}</div>`;
}

function renderToolCard(tool) {
  const domain = getDomain(tool.url);
  const logo = domain
    ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64" alt="" style="width:18px;height:18px;border-radius:3px;" onerror="this.style.display='none'">`
    : `<span>${categoryEmoji(tool.category)}</span>`;
  return `
    <div class="tool-card" data-slug="${escapeHtml(tool.slug)}">
      <div class="tool-card-top">
        ${logo}
        <span class="tool-card-name">${escapeHtml(tool.name)}</span>
        ${pricingBadge(tool.pricing)}
      </div>
      <div class="tool-card-cat">${categoryEmoji(tool.category)} ${escapeHtml(tool.category || '')}</div>
      <div class="tool-card-desc">${escapeHtml(tool.short_desc || tool.description || '')}</div>
      <div class="tool-card-visit">Visit ↗</div>
    </div>`;
}

function bindCardClicks() {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `tool.html?slug=${encodeURIComponent(card.dataset.slug)}`;
    });
  });
}

function injectJSONLD(tool) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description || tool.short_desc || '',
    applicationCategory: tool.category || '',
    offers: {
      '@type': 'Offer',
      price: tool.pricing === 'free' ? '0' : 'varies'
    },
    url: tool.url
  });
  document.head.appendChild(script);
}

function genericProsCons(category) {
  const map = {
    'Writing': { p: ['Fast content generation', 'Helps overcome writer\'s block', 'Scales content output'], c: ['Needs human editing', 'May produce generic text', 'Fact-checking required'] },
    'Coding': { p: ['Speeds up development', 'Handles boilerplate well', 'Good for debugging help'], c: ['Review output carefully', 'Security awareness needed', 'Not a substitute for tests'] },
    'Image': { p: ['Generates unique visuals fast', 'No design skills needed', 'Iterate in seconds'], c: ['May need prompt tuning', 'Licensing varies', 'Rendering takes time'] }
  };
  const fallback = { p: ['Saves time on repetitive tasks', 'Easy to get started', 'Continuous improvements'], c: ['Learning curve for some', 'Results need review', 'Premium features cost more'] };
  const data = map[category] || fallback;
  return data;
}

async function fetchTool(slug) {
  const loading = document.getElementById('loadingState');
  const content = document.getElementById('toolContent');
  try {
    const data = await (await fetch(`/api/tools/${encodeURIComponent(slug)}`)).json();
    if (!data.tool) {
      loading.innerHTML = '<div class="empty-state">Tool not found. <a href="index.html" style="color:var(--accent);">← Back to Directory</a></div>';
      return;
    }
    renderTool(data);
    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (e) {
    loading.innerHTML = '<div class="empty-state">Failed to load tool. <a href="index.html" style="color:var(--accent);">← Back to Directory</a></div>';
  }
}

function renderTool(data) {
  const tool = data.tool;
  const related = data.related || [];
  const reviews = data.reviews || [];

  document.title = `${tool.name} - AI Tools Directory`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', String(tool.description || tool.short_desc || '').slice(0, 155));
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute('content', `/og/tool/${encodeURIComponent(tool.slug)}`);
  injectJSONLD(tool);

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    document.getElementById('bcCat').textContent = tool.category || '';
    document.getElementById('bcName').textContent = tool.name;
  }

  const prosCons = genericProsCons(tool.category);

  const tags = String(tool.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const content = document.getElementById('toolContent');
  content.innerHTML = `
    <div class="page-header">
      ${toolLogo(tool, 48)}
      <div>
        <h1>${escapeHtml(tool.name)}</h1>
        <div style="margin-top:6px;font-size:13px;color:var(--text-2);">${categoryEmoji(tool.category)} ${escapeHtml(tool.category || '')}</div>
      </div>
      <div class="header-badges">
        ${pricingBadge(tool.pricing)}
      </div>
      ${tool.url ? `<a class="btn btn-accent" href="${escapeHtml(tool.url)}" target="_blank" rel="noopener">Visit ${escapeHtml(tool.name)} ↗</a>` : ''}
    </div>

    <div class="tag-chips">
      ${tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}
    </div>

    <p class="page-desc">${escapeHtml(tool.description || tool.short_desc || '')}</p>

    <div class="two-col">
      <div>
        <h3>Pros & Cons</h3>
        <table class="pros-cons">
          <thead><tr><th>✅ Pros</th><th>❌ Cons</th></tr></thead>
          <tbody>
            ${prosCons.p.map((p, i) => `<tr><td>${escapeHtml(p)}</td><td>${escapeHtml(prosCons.c[i] || '')}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div>
        <h3>Quick Facts</h3>
        <table class="facts-table">
          <tr><td>Pricing</td><td>${pricingBadge(tool.pricing)}</td></tr>
          <tr><td>Category</td><td>${escapeHtml(tool.category || '')}</td></tr>
          <tr><td>Added</td><td>${formatDate(tool.created_at)}</td></tr>
          <tr><td>Views</td><td>${tool.views || 0}</td></tr>
          ${tool.url ? `<tr><td>Visit</td><td><a href="${escapeHtml(tool.url)}" target="_blank" rel="noopener">${escapeHtml(getDomain(tool.url))}</a></td></tr>` : ''}
        </table>
      </div>
    </div>

    <div class="section-label" style="margin-top:40px;">Similar ${escapeHtml(tool.category || '')} Tools</div>
    <div class="grid" id="relatedGrid" style="margin-top:12px;">${related.map(renderToolCard).join('') || '<div class="empty-state">No related tools.</div>'}</div>

    <div class="review-list">
      <div class="section-label">Reviews & Tutorials</div>
      ${reviews.length ? reviews.map(r => `
        <div class="review-item">
          <a href="post.html?slug=${encodeURIComponent(r.slug)}">${escapeHtml(r.title)}</a>
          <span class="badge badge-freemium" style="text-transform:none;">${escapeHtml(r.category || '')}</span>
          <span class="meta">${formatDate(r.published_at)} · Read More →</span>
        </div>`).join('') : '<div class="empty-state" style="padding:20px;">No reviews yet.</div>'}
    </div>`;

  bindCardClicks();
}

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');
if (slug) {
  fetchTool(slug);
} else {
  document.getElementById('loadingState').innerHTML = '<div class="empty-state">No tool specified. <a href="index.html" style="color:var(--accent);">← Back to Directory</a></div>';
}
