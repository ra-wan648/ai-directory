/* Command-K search modal */
(function initSearch() {
  let allTools = [];
  let selectedIndex = 0;
  let modalOpen = false;

  const root = document.getElementById('searchModalRoot');

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
    try {
      return new URL(url).hostname;
    } catch (e) {
      return '';
    }
  }

  function pricingBadge(pricing) {
    if (!pricing) return '';
    return `<span class="badge badge-${escapeHtml(pricing)}">${escapeHtml(pricing)}</span>`;
  }

  async function loadTools() {
    try {
      const res = await fetch('/api/tools?limit=500');
      const data = await res.json();
      allTools = data.tools || [];
    } catch (e) {
      allTools = [];
    }
  }

  function openModal() {
    if (modalOpen) return;
    modalOpen = true;
    root.innerHTML = `
      <div class="search-overlay" id="searchOverlay">
        <div class="search-modal">
          <div class="search-modal-input">
            <span>🔍</span>
            <input type="text" id="searchInput" placeholder="Search AI tools..." autocomplete="off">
            <span style="color:var(--text-3);font-size:12px;">Esc</span>
          </div>
          <div class="search-results" id="searchResults"></div>
        </div>
      </div>`;

    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    input.focus();
    renderResults('');

    input.addEventListener('input', () => {
      selectedIndex = 0;
      renderResults(input.value);
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

  function highlight(items) {
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === selectedIndex);
    });
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function filterTools(query) {
    const q = query.toLowerCase().trim();
    if (!q) return allTools.slice(0, 50);
    return allTools
      .filter(t => {
        return (
          (t.name || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.tags || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }

  function renderResults(query) {
    const results = document.getElementById('searchResults');
    if (!results) return;
    const tools = filterTools(query);
    if (tools.length === 0) {
      results.innerHTML = '<div class="search-empty">No tools found for "' + escapeHtml(query) + '"</div>';
      return;
    }
    results.innerHTML = tools.map(t => {
      const domain = getDomain(t.url);
      const img = domain
        ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64" alt="" onerror="this.parentElement.removeChild(this)">`
        : '<span>🤖</span>';
      return `
        <div class="search-result" data-href="tool.html?slug=${encodeURIComponent(t.slug)}">
          ${img}
          <div>
            <div class="search-result-name">${escapeHtml(t.name)}</div>
            <div class="search-result-cat">${escapeHtml(t.category || '')}</div>
          </div>
          ${pricingBadge(t.pricing)}
        </div>`;
    }).join('');
    selectedIndex = 0;
    highlight(results.querySelectorAll('.search-result'));
  }

  function closeModal() {
    modalOpen = false;
    root.innerHTML = '';
  }

  function triggerSearch() {
    openModal();
  }

  /* Global keyboard shortcut */
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (modalOpen) closeModal();
      else openModal();
    }
  });

  /* Expose for 404 page trigger */
  window.openSearch = triggerSearch;

  /* Bind trigger elements */
  function bindTriggers() {
    document.querySelectorAll('#searchTrigger, [data-open-search]').forEach(el => {
      el.addEventListener('click', () => {
        if (modalOpen) closeModal();
        else openModal();
      });
    });
  }
  bindTriggers();

  loadTools();
})();
