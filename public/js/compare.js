/* ═══════════════════════════════════════════════════
   compare.js — tool comparison page.
   Fetches /api/compare?a=slug1&b=slug2 (worker.js).
   Depends on utils.js.
   ═══════════════════════════════════════════════════ */

(function initCompare() {
  const container = document.getElementById('compare-container');
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const a = params.get('a');
  const b = params.get('b');

  if (!a || !b) {
    container.innerHTML = '<p class="muted">Please provide two tools to compare (?a=slug1&b=slug2).</p>';
    return;
  }

  function featuresList(t) {
    if (t.features) {
      try {
        const parsed = JSON.parse(t.features);
        if (Array.isArray(parsed)) {
          const list = parsed.filter(Boolean).map(x => typeof x === 'object' ? Object.values(x)[0] : x);
          if (list.length) return list;
        }
      } catch (e) { /* fall through to tags */ }
    }
    const tags = String(t.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    return tags.length ? tags : ['—'];
  }

  function normalized(v) {
    if (v === null || v === undefined) return '';
    return String(v).trim().toLowerCase();
  }

  function logoCell(t) {
    return `
      <div class="compare-logo">
        <img src="${faviconFor(t.url, 40)}" alt="">
        <div>
          <div class="name">${escapeHtml(t.name)}</div>
          <div class="muted" style="font-size:12px;color:var(--text-3);">${escapeHtml(t.slug)}</div>
        </div>
      </div>`;
  }

  function featureCell(t) {
    const list = featuresList(t);
    return `<ul style="padding-left:18px;margin:0;">${list.map(f => `<li>${escapeHtml(String(f))}</li>`).join('')}</ul>`;
  }

  function visitCell(t) {
    return `<a class="compare-visit" href="${escapeHtml(t.url || '#')}" target="_blank" rel="noopener">Visit &nearr;</a>`;
  }

  async function load() {
    try {
      const data = await fetchJSON(`${API}/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
      const t1 = data.tool1;
      const t2 = data.tool2;
      if (!t1 || !t2) {
        container.innerHTML = '<p class="muted">One or both tools were not found.</p>';
        return;
      }

      const rows = [
        { label: 'Logo & Name', field: null, render: t => logoCell(t) },
        { label: 'Category', field: 'category', render: t => t.category || '—' },
        { label: 'Pricing', field: 'pricing', render: t => escapeHtml(t.pricing || '—') },
        { label: 'Description', field: 'description', render: t => escapeHtml(t.description || t.short_desc || '—') },
        { label: 'Features', field: null, render: t => featureCell(t) },
        { label: 'Visit', field: null, render: t => visitCell(t) }
      ];

      const thead = `
        <thead>
          <tr>
            <th class="row-label"></th>
            <th>${logoCell(t1)}</th>
            <th>${logoCell(t2)}</th>
          </tr>
        </thead>`;

      const tbody = rows.map(r => {
        const diff = r.field ? normalized(t1[r.field]) !== normalized(t2[r.field]) : false;
        return `
          <tr class="${diff ? 'diff-row' : ''}">
            <td class="row-label">${r.label}</td>
            <td>${r.render(t1)}</td>
            <td>${r.render(t2)}</td>
          </tr>`;
      }).join('');

      container.innerHTML = `<table class="compare-table">${thead}<tbody>${tbody}</tbody></table>`;
    } catch (e) {
      container.innerHTML = '<p class="muted">Failed to load comparison.</p>';
    }
  }

  load();
  setupNewsletter();
})();
