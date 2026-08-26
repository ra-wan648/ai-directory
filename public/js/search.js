/* ═══════════════════════════════════════════════════
   search.js — command-K search modal (uses /api/search).
   Auto-initializes on every page that has #searchModalRoot.
   ═══════════════════════════════════════════════════ */

(function initSearchModal() {
  const root = document.getElementById('searchModalRoot');
  if (!root) return;

  let modalOpen = false;
  let selectedIndex = 0;
  let queryTimer = null;

  function openModal() {
    if (modalOpen) return;
    modalOpen = true;
    root.innerHTML = `
      <div class="search-overlay" id="searchOverlay">
        <div class="search-modal">
          <div class="search-modal-head">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-modal-input" id="searchInput" placeholder="Search AI tools..." autocomplete="off">
            <span class="search-modal-hint">Esc</span>
          </div>
          <div class="search-results" id="searchResults"></div>
        </div>
      </div>`;

    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    input.focus();
    renderPopular();

    input.addEventListener('input', () => {
      clearTimeout(queryTimer);
      queryTimer = setTimeout(() => search(input.value), 200);
    });

    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.search-result');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length) {
          selectedIndex = (selectedIndex + 1) % items.length;
          highlight(items);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length) {
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          highlight(items);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          window.location.href = items[selectedIndex].dataset.href;
        }
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });

    document.getElementById('searchOverlay').addEventListener('mousedown', (e) => {
      if (e.target.id === 'searchOverlay') closeModal();
    });
  }

  function closeModal() {
    modalOpen = false;
    root.innerHTML = '';
  }

  function highlight(items) {
    items.forEach((el, i) => el.classList.toggle('selected', i === selectedIndex));
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  async function search(q) {
    q = q.trim();
    if (!q) {
      renderPopular();
      return;
    }
    const results = document.getElementById('searchResults');
    results.innerHTML = '<div class="search-empty">Searching…</div>';
    try {
      const data = await fetchJSON(`${API}/api/search?q=${encodeURIComponent(q)}`);
      renderResults(data.results || []);
    } catch (e) {
      results.innerHTML = '<div class="search-empty">Search unavailable. Try again.</div>';
    }
  }

  async function renderPopular() {
    const results = document.getElementById('searchResults');
    results.innerHTML = '<div class="search-empty">Loading…</div>';
    try {
      const data = await fetchJSON(`${API}/api/tools?sort=views&limit=8`);
      const tools = data.tools || [];
      if (!tools.length) {
        results.innerHTML = '<div class="search-empty">Start typing to search tools.</div>';
        return;
      }
      const heading = '<div class="search-empty" style="text-align:left;padding:10px 14px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Popular tools</div>';
      results.innerHTML = heading + tools.map(resultItem).join('');
      bindResultClicks();
      selectedIndex = 0;
    } catch (e) {
      results.innerHTML = '<div class="search-empty">Start typing to search tools.</div>';
    }
  }

  function resultItem(t) {
    const domain = getDomain(t.url);
    const img = domain
      ? `<img src="${faviconFor(t.url, 64)}" alt="" onerror="this.style.display='none'">`
      : `<span style="font-size:20px">${categoryEmoji(t.category)}</span>`;
    return `
      <div class="search-result" data-href="/tool/${encodeURIComponent(t.slug)}">
        ${img}
        <div class="result-text">
          <div class="search-result-name">${escapeHtml(t.name)}</div>
          <div class="search-result-cat">${escapeHtml(t.category || '')}</div>
        </div>
        ${pricingBadge(t.pricing)}
      </div>`;
  }

  function renderResults(tools) {
    const results = document.getElementById('searchResults');
    if (!tools.length) {
      results.innerHTML = '<div class="search-empty">No tools found.</div>';
      return;
    }
    results.innerHTML = tools.map(resultItem).join('');
    bindResultClicks();
    selectedIndex = 0;
  }

  function bindResultClicks() {
    const results = document.getElementById('searchResults');
    results.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        window.location.href = el.dataset.href;
      });
    });
  }

  /* Global ⌘K / Ctrl+K shortcut */
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (modalOpen) closeModal();
      else openModal();
    }
  });

  /* Expose for 404 page button */
  window.openSearch = openModal;

  /* Bind trigger elements (navbar search bar, 404 buttons) */
  document.querySelectorAll('#searchTrigger, [data-open-search]').forEach(el => {
    el.addEventListener('click', () => {
      if (modalOpen) closeModal();
      else openModal();
    });
  });
})();
