/* ═══════════════════════════════════════════════════
   prompts.js — prompt library page.
   Depends on utils.js.
   ═══════════════════════════════════════════════════ */

(function initPrompts() {
  const grid = document.getElementById('promptGrid');
  const empty = document.getElementById('promptEmpty');
  if (!grid) return;

  const state = {
    all: [],
    category: '',
    query: ''
  };

  function promptCard(p) {
    const tools = String(p.compatible_tools || '').split(',').map(t => t.trim()).filter(Boolean);
    const badges = tools.map(t => `<span class="compat-badge">${escapeHtml(t.toUpperCase())}</span>`).join('');
    return `
      <div class="prompt-card">
        <div class="prompt-eyebrow">${escapeHtml(p.category || 'prompt')}</div>
        <div class="prompt-title">${escapeHtml(p.title)}</div>
        <div class="prompt-desc">${escapeHtml(p.description || '')}</div>
        <div class="compat-badges">${badges}</div>
        <div class="prompt-actions">
          <button class="btn btn-accent btn-sm" data-copy="${p.id}" data-text="${escapeHtml(p.prompt_text || '')}">&#128203; COPY</button>
        </div>
      </div>`;
  }

  function copyText(btn) {
    const id = btn.dataset.copy;
    const text = btn.dataset.text;
    const done = () => {
      btn.classList.add('btn-copied');
      btn.textContent = '✅ Copied!';
      setTimeout(() => {
        btn.classList.remove('btn-copied');
        btn.textContent = '📋 COPY';
      }, 2000);
    };
    navigator.clipboard.writeText(text).then(done).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
    });
    fetch(`${API}/api/prompts/copy/${id}`, { method: 'POST' }).catch(() => {});
  }

  function render() {
    let filtered = state.all;
    if (state.category) {
      filtered = filtered.filter(p => (p.category || '').toLowerCase() === state.category.toLowerCase());
    }
    if (state.query) {
      const q = state.query.toLowerCase();
      filtered = filtered.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.prompt_text || '').toLowerCase().includes(q)
      );
    }
    grid.innerHTML = filtered.map(promptCard).join('');
    empty.style.display = filtered.length === 0 ? 'block' : 'none';
    grid.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyText(btn);
      });
    });
  }

  async function load() {
    try {
      const data = await fetchJSON(`${API}/api/prompts?limit=100`);
      state.all = data.prompts || [];
      render();
    } catch (e) {
      grid.innerHTML = '<div class="empty-state" style="padding:30px;">Failed to load prompts.</div>';
    }
  }

  document.getElementById('promptSearch').addEventListener('input', e => {
    state.query = e.target.value.trim();
    render();
  });

  document.querySelectorAll('#promptFilters [data-pcat]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#promptFilters [data-pcat]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.category = pill.dataset.pcat;
      render();
    });
  });

  load();
  setupNewsletter();
})();
