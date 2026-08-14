/* Compare page */

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

function toolHeader(tool) {
  const domain = getDomain(tool.url);
  const img = domain
    ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128" alt="" onerror="this.style.display='none'">`
    : '<span>🤖</span>';
  return `
    <div class="compare-header">
      ${img}
      <h2>${escapeHtml(tool.name)}</h2>
      ${pricingBadge(tool.pricing)}
    </div>`;
}

function renderCompare(data) {
  const t1 = data.tool1;
  const t2 = data.tool2;

  document.title = `${t1.name} vs ${t2.name} - Compare AI Tools`;
  document.getElementById('compareTitle').textContent = `${t1.name} vs ${t2.name}`;

  const tags1 = String(t1.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const tags2 = String(t2.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const content = document.getElementById('compareContent');
  content.innerHTML = `
    <div class="compare-cols">
      <div>${toolHeader(t1)}</div>
      <div>${toolHeader(t2)}</div>
    </div>

    <table class="compare-table">
      <thead>
        <tr><th>Feature</th><th>${escapeHtml(t1.name)}</th><th>${escapeHtml(t2.name)}</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Pricing</td>
          <td>${pricingBadge(t1.pricing)}</td>
          <td>${pricingBadge(t2.pricing)}</td>
        </tr>
        <tr>
          <td>Category</td>
          <td>${escapeHtml(t1.category || '')}</td>
          <td>${escapeHtml(t2.category || '')}</td>
        </tr>
        <tr>
          <td>Tags</td>
          <td>${tags1.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join(' ')}</td>
          <td>${tags2.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join(' ')}</td>
        </tr>
        <tr>
          <td>Description</td>
          <td class="compare-desc">${escapeHtml(t1.short_desc || t1.description || '')}</td>
          <td class="compare-desc">${escapeHtml(t2.short_desc || t2.description || '')}</td>
        </tr>
        <tr>
          <td>Views</td>
          <td>${t1.views || 0}</td>
          <td>${t2.views || 0}</td>
        </tr>
        <tr>
          <td>Link</td>
          <td>${t1.url ? `<a class="btn btn-ghost btn-sm" href="${escapeHtml(t1.url)}" target="_blank" rel="noopener">Visit ↗</a>` : ''}</td>
          <td>${t2.url ? `<a class="btn btn-ghost btn-sm" href="${escapeHtml(t2.url)}" target="_blank" rel="noopener">Visit ↗</a>` : ''}</td>
        </tr>
      </tbody>
    </table>

    <div class="compare-links">
      <a class="btn btn-accent" href="tool.html?slug=${encodeURIComponent(t1.slug)}">View Full ${escapeHtml(t1.name)} Details</a>
      <a class="btn btn-accent" href="tool.html?slug=${encodeURIComponent(t2.slug)}">View Full ${escapeHtml(t2.name)} Details</a>
    </div>`;

  document.getElementById('loadingState').style.display = 'none';
  content.style.display = 'block';
}

async function loadCompare() {
  const params = new URLSearchParams(window.location.search);
  const t1 = params.get('t1');
  const t2 = params.get('t2');
  const loading = document.getElementById('loadingState');

  if (!t1 || !t2) {
    loading.innerHTML = '<div class="empty-state">Add two tools to compare, e.g. compare.html?t1=chatgpt&t2=claude</div>';
    return;
  }

  try {
    const data = await (await fetch(`/api/compare/${encodeURIComponent(t1)}/${encodeURIComponent(t2)}`)).json();
    if (!data.tool1 || !data.tool2) {
      loading.innerHTML = '<div class="empty-state">One or both tools not found. <a href="index.html" style="color:var(--accent);">Browse the directory</a></div>';
      return;
    }
    renderCompare(data);
  } catch (e) {
    loading.innerHTML = '<div class="empty-state">Failed to load comparison. <a href="index.html" style="color:var(--accent);">Browse the directory</a></div>';
  }
}

loadCompare();
