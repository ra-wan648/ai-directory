const API = '';

const params = new URLSearchParams(location.search);
const a = params.get('a');
const b = params.get('b');

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function faviconFor(url, size = 40) {
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

function featuresList(features) {
  if (!features) return ['—'];
  try {
    const parsed = JSON.parse(features);
    if (Array.isArray(parsed)) {
      const list = parsed.filter(x => x).map(x => typeof x === 'object' ? Object.values(x)[0] : x);
      return list.length ? list : ['—'];
    }
  } catch (e) {}
  return ['—'];
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('compare-container');
  if (!a || !b) {
    container.innerHTML = '<p class="muted">Please provide two tools to compare (?a=slug1&b=slug2).</p>';
    return;
  }

  let data;
  try {
    data = await fetchJSON(`${API}/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  } catch (e) {
    container.innerHTML = '<p class="muted">Failed to load comparison.</p>';
    return;
  }

  const toolA = data.toolA;
  const toolB = data.toolB;

  if (!toolA || !toolB) {
    container.innerHTML = '<p class="muted">One or both tools were not found.</p>';
    return;
  }

  const rows = [
    { label: 'Logo & Name', field: null, render: t => logoCell(t) },
    { label: 'Category', field: 'category', render: t => t.category || '—' },
    { label: 'Pricing', field: 'pricing', render: t => t.pricing || '—' },
    { label: 'Description', field: 'description_full', render: t => escapeHtml((t.description_full || t.description || '—')) },
    { label: 'Features', field: 'features', render: t => featureCell(t) },
    { label: 'Visit', field: null, render: t => visitCell(t) }
  ];

  const thead = `
    <thead>
      <tr>
        <th class="row-label"></th>
        <th>${logoCell(toolA)}</th>
        <th>${logoCell(toolB)}</th>
      </tr>
    </thead>
  `;

  const tbody = rows.map(r => {
    const vA = r.render(toolA);
    const vB = r.render(toolB);
    const diff = r.field ? normalized(toolA[r.field]) !== normalized(toolB[r.field]) : false;
    return `
      <tr class="${diff ? 'diff-row' : ''}">
        <td class="row-label">${r.label}</td>
        <td>${vA}</td>
        <td>${vB}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `<table class="compare-table">${thead}<tbody>${tbody}</tbody></table>`;
});

function normalized(v) {
  if (v == null) return '';
  let s = String(v).trim().toLowerCase();
  if (s.startsWith('[')) {
    try { s = JSON.parse(v).map(x => (x && x.value) || x).sort().join('|'); } catch (e) {}
  }
  return s;
}

function logoCell(t) {
  return `
    <div class="compare-logo">
      <img src="${faviconFor(t.url, 40)}" alt="">
      <div>
        <div class="name">${escapeHtml(t.name)}</div>
        <div class="muted" style="font-size:12px">${escapeHtml(t.slug)}</div>
      </div>
    </div>
  `;
}

function featureCell(t) {
  const list = featuresList(t.features);
  return `<ul style="padding-left:18px;margin:0">${list.map(f => `<li>${escapeHtml(String(f))}</li>`).join('')}</ul>`;
}

function visitCell(t) {
  return `<a class="compare-visit" href="${escapeHtml(t.visit_url || t.url || '#')}" target="_blank" rel="noopener">Visit ↗</a>`;
}
